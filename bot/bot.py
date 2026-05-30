"""
bot.py — CoolServ Service Intelligence Bot
Main entry point. Bootstraps all modules and registers scheduled jobs.

Scheduled Jobs:
  - Overdue check:    Every 30 minutes
  - Maintenance reminders: Daily at 09:00
  - Daily digest:     Daily at 08:00
  - Weekly digest:    Every Monday at 09:00

Deployment: Render Background Worker (free tier)
"""
import os
import sys
import signal
import logging
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Logging setup ─────────────────────────────────────────────────────────────
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='%(asctime)s  %(levelname)-8s  %(name)-20s  %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger('coolserv.bot')


# ── Graceful shutdown ─────────────────────────────────────────────────────────
_running = True

def _handle_signal(signum, frame):
    global _running
    logger.info(f'🛑 Received signal {signum} — shutting down gracefully...')
    _running = False

signal.signal(signal.SIGINT,  _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


# ── Job wrappers (with error isolation) ──────────────────────────────────────
def run_overdue_check():
    try:
        from monitor import check_overdue_bookings
        check_overdue_bookings()
    except Exception as e:
        logger.error(f'[overdue_check] Unexpected error: {e}', exc_info=True)


def run_daily_digest():
    try:
        from digest import send_daily_digest
        send_daily_digest()
    except Exception as e:
        logger.error(f'[daily_digest] Unexpected error: {e}', exc_info=True)


def run_weekly_digest():
    try:
        from digest import send_weekly_digest
        send_weekly_digest()
    except Exception as e:
        logger.error(f'[weekly_digest] Unexpected error: {e}', exc_info=True)


def run_maintenance_reminders():
    try:
        from reminder import send_maintenance_reminders
        send_maintenance_reminders()
    except Exception as e:
        logger.error(f'[reminders] Unexpected error: {e}', exc_info=True)


# ── Database connectivity check ───────────────────────────────────────────────
def check_db_connection() -> bool:
    try:
        from db import get_db
        db = get_db()
        db.list_collection_names()
        return True
    except Exception as e:
        logger.error(f'❌ Database connection failed: {e}')
        return False


# ── Startup banner ────────────────────────────────────────────────────────────
def print_banner():
    banner = f"""
╔══════════════════════════════════════════════════════════╗
║          ❄️  CoolServ Service Intelligence Bot           ║
║              TapNext  ·  MCA Final Year Project          ║
╠══════════════════════════════════════════════════════════╣
║  Started:  {datetime.utcnow().strftime('%d %b %Y %H:%M:%S UTC'):<44}║
║  Log Level: {log_level:<43}║
╚══════════════════════════════════════════════════════════╝"""
    print(banner)


# ── Main scheduler loop ───────────────────────────────────────────────────────
def main():
    import schedule

    print_banner()

    # Verify DB connection before scheduling
    logger.info('🔌 Testing MongoDB connection...')
    if not check_db_connection():
        logger.error('Cannot connect to MongoDB. Check MONGO_URI. Exiting.')
        sys.exit(1)

    logger.info('✅ MongoDB connection verified')

    # Read schedule config from env
    overdue_interval   = int(os.getenv('OVERDUE_CHECK_INTERVAL_MINUTES', 30))
    daily_time         = os.getenv('DAILY_DIGEST_TIME', '08:00')
    weekly_day         = os.getenv('WEEKLY_DIGEST_DAY', 'monday').lower()
    weekly_time        = os.getenv('WEEKLY_DIGEST_TIME', '09:00')

    # ── Register jobs ─────────────────────────────────────────────────────────
    schedule.every(overdue_interval).minutes.do(run_overdue_check)
    schedule.every().day.at(daily_time).do(run_daily_digest)
    schedule.every().day.at('09:00').do(run_maintenance_reminders)
    getattr(schedule.every(), weekly_day).at(weekly_time).do(run_weekly_digest)

    logger.info('📅 Scheduled jobs registered:')
    logger.info(f'   • Overdue check:           every {overdue_interval} minutes')
    logger.info(f'   • Maintenance reminders:    daily at 09:00')
    logger.info(f'   • Daily digest:             daily at {daily_time}')
    logger.info(f'   • Weekly digest:            {weekly_day} at {weekly_time}')
    logger.info('')
    logger.info('🚀 Bot is running. Press Ctrl+C to stop.')
    logger.info('')

    # Run overdue check immediately on startup
    logger.info('▶️  Running initial overdue check...')
    run_overdue_check()

    # ── Main loop ─────────────────────────────────────────────────────────────
    while _running:
        schedule.run_pending()
        time.sleep(30)  # Check every 30 seconds

    logger.info('👋 CoolServ Bot stopped cleanly.')


if __name__ == '__main__':
    main()
