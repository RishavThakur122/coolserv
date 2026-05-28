"""
reminder.py — CoolServ Bot: Predictive Maintenance Reminder Engine
Scans AC units collection for units overdue for service.
Sends reminder emails to customers via the Node.js Nodemailer API.
Logs sent reminders to MongoDB to prevent duplicate sends.
"""
import os
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv
from db import get_db, get_units_due_service, log_reminder, was_reminder_sent_recently

load_dotenv()
logger = logging.getLogger(__name__)


def _build_reminder_email(customer_name: str, unit: dict, reminder_type: str) -> str:
    days = int(os.getenv('SERVICE_REMINDER_DAYS', 90))
    full_days = int(os.getenv('FULL_SERVICE_REMINDER_DAYS', 365))

    if reminder_type == 'full_service':
        title    = 'Annual Full Service Recommended'
        message  = f'Your {unit.get("brand","")} {unit.get("model","")} AC unit is due for an annual full service. Regular annual servicing maintains optimal performance and prevents costly breakdowns.'
        urgency  = '#dc2626'
        icon     = '🔧'
        service  = 'Full Service / Overhaul'
    else:
        title    = 'Routine Maintenance Due'
        message  = f'Your {unit.get("brand","")} {unit.get("model","")} AC unit is due for routine maintenance. We recommend servicing every {days} days to maintain efficiency and air quality.'
        urgency  = '#ca8a04'
        icon     = '🧹'
        service  = 'Routine Maintenance'

    last_service = unit.get('lastServiceDate')
    last_service_str = (
        datetime.strftime(last_service, '%d %B %Y')
        if isinstance(last_service, datetime)
        else 'Never serviced'
    )

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;}}
    .container{{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}}
    .header{{background:linear-gradient(135deg,#0077b3,#00bcff);padding:28px 32px;}}
    .header h1{{color:#fff;margin:0;font-size:20px;}}
    .header p{{color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;}}
    .body{{padding:28px 32px;color:#334155;}}
    .unit-card{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:18px 0;}}
    .unit-card h3{{margin:0 0 10px;color:#0f172a;font-size:16px;}}
    .detail-row{{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px;}}
    .detail-row:last-child{{border-bottom:none;}}
    .detail-label{{color:#64748b;}}
    .detail-value{{color:#0f172a;font-weight:500;}}
    .alert-box{{background:#fef9c3;border-left:4px solid {urgency};border-radius:6px;padding:14px 16px;margin:16px 0;font-size:13px;color:#334155;}}
    .cta-btn{{display:inline-block;background:#0077b3;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;}}
    .footer{{background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>❄️ CoolServ Maintenance Reminder</h1>
    <p>{icon} {title}</p>
  </div>
  <div class="body">
    <p>Dear <strong>{customer_name}</strong>,</p>
    <p>{message}</p>

    <div class="unit-card">
      <h3>🌬️ {unit.get("brand","")} {unit.get("model","")}</h3>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">{unit.get("locationLabel","—")}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Capacity</span>
        <span class="detail-value">{unit.get("capacity","—")}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type</span>
        <span class="detail-value">{unit.get("acType","—")}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Installed</span>
        <span class="detail-value">{unit.get("installYear","—")}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Last Serviced</span>
        <span class="detail-value">{last_service_str}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Recommended Service</span>
        <span class="detail-value">{service}</span>
      </div>
    </div>

    <div class="alert-box">
      ⏰ <strong>Action Required:</strong> Please schedule your AC service at the earliest to avoid performance degradation and higher repair costs later.
    </div>

    <p>Log in to your CoolServ account to book a service appointment in under 2 minutes.</p>
  </div>
  <div class="footer">
    © {datetime.utcnow().year} CoolServ by TapNext · You received this because your AC unit is due for service.<br>
    To unsubscribe from reminders, manage your notification preferences in your CoolServ profile.
  </div>
</div>
</body>
</html>"""


def _send_reminder_email(to_email: str, customer_name: str, unit: dict, reminder_type: str) -> bool:
    html = _build_reminder_email(customer_name, unit, reminder_type)
    service_label = 'Annual Full Service' if reminder_type == 'full_service' else 'Routine Maintenance'
    brand = unit.get('brand', 'Your AC')
    location = unit.get('locationLabel', '')

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'[CoolServ] {service_label} Reminder — {brand} ({location})'
        msg['From']    = os.getenv('SMTP_FROM', 'CoolServ <noreply@coolserv.in>')
        msg['To']      = to_email
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(os.getenv('SMTP_HOST', 'smtp.gmail.com'),
                          int(os.getenv('SMTP_PORT', 587))) as server:
            server.starttls()
            server.login(os.getenv('SMTP_USER', ''), os.getenv('SMTP_PASS', ''))
            server.send_message(msg)

        logger.info(f'📧 Reminder sent to {to_email} — {service_label} for unit {unit.get("_id")}')
        return True
    except Exception as e:
        logger.error(f'Reminder email error: {e}')
        return False


def send_maintenance_reminders() -> None:
    """Scan all AC units and send reminders for overdue units."""
    logger.info('🔔 Scanning AC units for maintenance reminders...')

    maintenance_days  = int(os.getenv('SERVICE_REMINDER_DAYS', 90))
    full_service_days = int(os.getenv('FULL_SERVICE_REMINDER_DAYS', 365))

    try:
        units = get_units_due_service(maintenance_days, full_service_days)
    except Exception as e:
        logger.error(f'Reminder DB error: {e}')
        return

    if not units:
        logger.info('✅ No AC units due for service reminders')
        return

    logger.info(f'📋 Found {len(units)} unit(s) potentially due for service')

    db = get_db()
    sent_count = 0

    for unit in units:
        unit_id = unit['_id']
        customer_id = unit.get('customerId')
        if not customer_id:
            continue

        # Determine reminder type
        last_service = unit.get('lastServiceDate')
        full_service_cutoff = datetime.utcnow() - timedelta(days=full_service_days)

        if isinstance(last_service, datetime) and last_service < full_service_cutoff:
            reminder_type = 'full_service'
        else:
            reminder_type = 'maintenance'

        # Check cooldown (don't send same reminder within 30 days)
        if was_reminder_sent_recently(unit_id, reminder_type, within_days=30):
            logger.debug(f'⏳ Skipping unit {unit_id} — reminder sent recently')
            continue

        # Get customer info
        from bson import ObjectId
        try:
            user = db.users.find_one(
                {'_id': ObjectId(str(customer_id))},
                {'email': 1, 'firstName': 1, 'lastName': 1, 'isActive': 1}
            )
        except Exception:
            continue

        if not user or not user.get('isActive', True):
            continue

        customer_name = f"{user.get('firstName','')} {user.get('lastName','')}".strip() or 'Valued Customer'
        customer_email = user.get('email')

        if not customer_email:
            continue

        # Send reminder
        success = _send_reminder_email(customer_email, customer_name, unit, reminder_type)
        if success:
            log_reminder(unit_id, reminder_type)
            sent_count += 1

    logger.info(f'✅ Maintenance reminders sent: {sent_count}')
