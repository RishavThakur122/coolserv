"""
db.py — CoolServ Bot: MongoDB Data Access Layer
Centralized pymongo connection with helper query functions.
"""
import os
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_client = None
_db     = None


def get_db():
    """Return the coolserv database, creating connection if needed."""
    global _client, _db
    if _db is not None:
        return _db
    uri = os.getenv('MONGO_URI')
    if not uri:
        raise ValueError('MONGO_URI environment variable is not set')
    try:
        _client = MongoClient(uri, serverSelectionTimeoutMS=10000, tls=True)
        _client.admin.command('ping')
        _db = _client['coolserv']
        logger.info('✅ MongoDB connected (bot)')
        return _db
    except ConnectionFailure as e:
        logger.error(f'❌ MongoDB connection failed: {e}')
        raise


def get_overdue_bookings(threshold_hours: int = 2) -> list:
    """Return Assigned/InProgress bookings past their scheduled time by threshold_hours."""
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(hours=threshold_hours)
    bookings = list(db.bookings.find({
        'status': {'$in': ['Assigned', 'InProgress']},
        'scheduledDate': {'$lt': cutoff},
    }))
    return bookings


def get_bookings_range(start: datetime, end: datetime) -> list:
    """Return all bookings in a date range (by createdAt)."""
    db = get_db()
    return list(db.bookings.find({'createdAt': {'$gte': start, '$lt': end}}))


def get_completed_bookings_range(start: datetime, end: datetime) -> list:
    """Return completed bookings in a date range."""
    db = get_db()
    return list(db.bookings.find({
        'status': 'Completed',
        'completedAt': {'$gte': start, '$lt': end},
    }))


def get_units_due_service(maintenance_days: int = 90, full_service_days: int = 365) -> list:
    """Return AC units whose lastServiceDate exceeds threshold or has never been serviced."""
    db = get_db()
    maintenance_cutoff  = datetime.utcnow() - timedelta(days=maintenance_days)
    full_service_cutoff = datetime.utcnow() - timedelta(days=full_service_days)

    units = list(db.acunits.find({
        'isActive': True,
        '$or': [
            {'lastServiceDate': {'$lt': maintenance_cutoff}},
            {'lastServiceDate': None},
            {'lastServiceDate': {'$exists': False}},
        ]
    }))
    return units


def get_customer_email(customer_id) -> str | None:
    """Return email for a customer ObjectId."""
    db = get_db()
    try:
        from bson import ObjectId
        user = db.users.find_one({'_id': ObjectId(str(customer_id))}, {'email': 1})
        return user.get('email') if user else None
    except Exception as e:
        logger.error(f'get_customer_email error: {e}')
        return None


def log_reminder(unit_id, reminder_type: str) -> None:
    """Log a sent reminder to prevent duplicate sends."""
    db = get_db()
    from bson import ObjectId
    db.reminders.update_one(
        {'unitId': ObjectId(str(unit_id)), 'type': reminder_type},
        {'$set': {
            'unitId': ObjectId(str(unit_id)),
            'type': reminder_type,
            'sentAt': datetime.utcnow(),
        }},
        upsert=True,
    )


def was_reminder_sent_recently(unit_id, reminder_type: str, within_days: int = 30) -> bool:
    """Check if a reminder was already sent recently for this unit."""
    db = get_db()
    from bson import ObjectId
    cutoff = datetime.utcnow() - timedelta(days=within_days)
    doc = db.reminders.find_one({
        'unitId': ObjectId(str(unit_id)),
        'type': reminder_type,
        'sentAt': {'$gte': cutoff},
    })
    return doc is not None


def get_all_technicians() -> list:
    """Return all technician documents with populated user data."""
    db = get_db()
    pipeline = [
        {'$lookup': {
            'from': 'users',
            'localField': 'userId',
            'foreignField': '_id',
            'as': 'user',
        }},
        {'$unwind': {'path': '$user', 'preserveNullAndEmptyArrays': True}},
    ]
    return list(db.technicians.aggregate(pipeline))


def get_dashboard_stats() -> dict:
    """Return quick KPI stats for digest emails."""
    db = get_db()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today - timedelta(days=1)

    yesterday_bookings = list(db.bookings.find({
        'createdAt': {'$gte': yesterday_start, '$lt': today}
    }))

    total      = len(yesterday_bookings)
    completed  = sum(1 for b in yesterday_bookings if b.get('status') == 'Completed')
    pending    = sum(1 for b in yesterday_bookings if b.get('status') == 'Pending')
    cancelled  = sum(1 for b in yesterday_bookings if b.get('status') == 'Cancelled')
    revenue    = sum(b.get('estimatedAmount', 0) for b in yesterday_bookings if b.get('status') == 'Completed')

    return {
        'date':      yesterday_start.strftime('%d %B %Y'),
        'total':     total,
        'completed': completed,
        'pending':   pending,
        'cancelled': cancelled,
        'revenue':   revenue,
    }
