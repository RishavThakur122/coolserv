"""
monitor.py — CoolServ Bot: Overdue Booking Watcher
Polls MongoDB every 30 minutes for overdue bookings.
Sends Telegram push alert + follow-up email to admin.
Implements cooldown: same booking re-alerted only after 3 hours.
"""
import os
import logging
import smtplib
import asyncio
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from db import get_db, get_overdue_bookings
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# In-memory cooldown store: {booking_id_str: last_alerted_datetime}
_alerted: dict = {}
COOLDOWN_HOURS = 3


def _is_on_cooldown(booking_id: str) -> bool:
    last = _alerted.get(booking_id)
    if not last:
        return False
    return datetime.utcnow() - last < timedelta(hours=COOLDOWN_HOURS)


def _mark_alerted(booking_id: str) -> None:
    _alerted[booking_id] = datetime.utcnow()


# ── Telegram ──────────────────────────────────────────────────────────────────
async def _send_telegram_async(message: str) -> None:
    token   = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        logger.warning('Telegram not configured — skipping alert')
        return
    try:
        from telegram import Bot
        bot = Bot(token=token)
        await bot.send_message(chat_id=chat_id, text=message, parse_mode='HTML')
        logger.info('📱 Telegram alert sent')
    except Exception as e:
        logger.error(f'Telegram send error: {e}')


def send_telegram_alert(message: str) -> None:
    try:
        asyncio.run(_send_telegram_async(message))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        loop.run_until_complete(_send_telegram_async(message))
        loop.close()


# ── Email ─────────────────────────────────────────────────────────────────────
def send_overdue_email(overdue_list: list) -> None:
    admin_email = os.getenv('ADMIN_EMAIL')
    if not admin_email:
        return

    rows = ''
    for b in overdue_list:
        delay = datetime.utcnow() - b.get('scheduledDate', datetime.utcnow())
        hours = int(delay.total_seconds() // 3600)
        mins  = int((delay.total_seconds() % 3600) // 60)
        rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;">
            #{str(b['_id'])[-6:].upper()}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{b.get('serviceType','—')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{b.get('status','—')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600;">
            {hours}h {mins}m overdue
          </td>
        </tr>"""

    html = f"""
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;">
    <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Overdue Bookings Alert</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">CoolServ Automated Monitor · {datetime.utcnow().strftime('%d %b %Y %H:%M')} UTC</p>
      </div>
      <div style="padding:24px 32px;">
        <p style="color:#334155;">{len(overdue_list)} booking(s) require immediate attention:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">ID</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Service</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Status</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Delay</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">Please log in to the admin panel to take action.</p>
      </div>
      <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
        © {datetime.utcnow().year} CoolServ Bot by TapNext · Automated Alert
      </div>
    </div>
    </body></html>"""

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'[CoolServ Alert] {len(overdue_list)} Overdue Booking(s) — Action Required'
        msg['From']    = os.getenv('SMTP_FROM', 'CoolServ Bot')
        msg['To']      = admin_email
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(os.getenv('SMTP_HOST','smtp.gmail.com'), int(os.getenv('SMTP_PORT',587))) as server:
            server.starttls()
            server.login(os.getenv('SMTP_USER',''), os.getenv('SMTP_PASS',''))
            server.send_message(msg)
        logger.info(f'📧 Overdue email sent to {admin_email}')
    except Exception as e:
        logger.error(f'Overdue email error: {e}')


# ── Main check ────────────────────────────────────────────────────────────────
def check_overdue_bookings() -> None:
    logger.info('🔍 Checking for overdue bookings...')
    threshold = int(os.getenv('OVERDUE_THRESHOLD_HOURS', 2))

    try:
        overdue = get_overdue_bookings(threshold)
    except Exception as e:
        logger.error(f'DB query error in monitor: {e}')
        return

    if not overdue:
        logger.info('✅ No overdue bookings found')
        return

    # Filter out bookings on cooldown
    fresh = [b for b in overdue if not _is_on_cooldown(str(b['_id']))]
    if not fresh:
        logger.info(f'⏳ {len(overdue)} overdue bookings but all on cooldown')
        return

    logger.warning(f'⚠️  {len(fresh)} overdue booking(s) detected')

    # Build Telegram message
    lines = [f'⚠️ <b>CoolServ: {len(fresh)} Overdue Booking(s)</b>\n']
    for b in fresh:
        delay = datetime.utcnow() - b.get('scheduledDate', datetime.utcnow())
        hours = int(delay.total_seconds() // 3600)
        mins  = int((delay.total_seconds() % 3600) // 60)
        lines.append(
            f'• <b>#{str(b["_id"])[-6:].upper()}</b> — {b.get("serviceType","?")} '
            f'({b.get("status","?")})\n  🕐 {hours}h {mins}m overdue'
        )
    lines.append('\n👉 Log in to admin panel to take action.')
    telegram_msg = '\n'.join(lines)

    send_telegram_alert(telegram_msg)
    send_overdue_email(fresh)

    # Mark all as alerted
    for b in fresh:
        _mark_alerted(str(b['_id']))
