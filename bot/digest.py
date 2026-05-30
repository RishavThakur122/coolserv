"""
digest.py — CoolServ Bot: Daily & Weekly Email Digest
Daily digest at 08:00: Yesterday's booking summary.
Weekly digest every Monday at 09:00: Full weekly KPI report with embedded chart.
Uses Jinja2 HTML templates + smtplib SMTP_SSL.
"""
import os
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path

from jinja2 import Environment, BaseLoader
from dotenv import load_dotenv

from db import get_db, get_bookings_range, get_completed_bookings_range, get_all_technicians
from analytics import generate_analytics_chart

load_dotenv()
logger = logging.getLogger(__name__)


# ── Jinja2 HTML templates ─────────────────────────────────────────────────────

DAILY_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;}
    .container{max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#0077b3,#00bcff);padding:28px 32px;}
    .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:-0.3px;}
    .header p{color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;}
    .body{padding:28px 32px;color:#334155;}
    .kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0;}
    .kpi-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;}
    .kpi-value{font-size:32px;font-weight:800;color:#0077b3;line-height:1;}
    .kpi-label{font-size:12px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;}
    .kpi-card.green .kpi-value{color:#16a34a;}
    .kpi-card.amber .kpi-value{color:#ca8a04;}
    .kpi-card.red   .kpi-value{color:#dc2626;}
    .section-title{font-size:14px;font-weight:700;color:#0f172a;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
    .stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;}
    .stat-label{color:#64748b;}
    .stat-value{font-weight:600;color:#0f172a;}
    .revenue{font-size:28px;font-weight:800;color:#16a34a;text-align:center;margin:16px 0;}
    .footer{background:#f8fafc;padding:18px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}
    .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;}
    .badge-up{background:#dcfce7;color:#16a34a;}
    .badge-down{background:#fee2e2;color:#dc2626;}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>❄️ CoolServ Daily Digest</h1>
    <p>Summary for {{ stats.date }} · Generated {{ now }}</p>
  </div>
  <div class="body">
    <p>Good morning! Here's what happened at CoolServ yesterday.</p>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">{{ stats.total }}</div>
        <div class="kpi-label">Total Bookings</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-value">{{ stats.completed }}</div>
        <div class="kpi-label">Completed</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-value">{{ stats.pending }}</div>
        <div class="kpi-label">Still Pending</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-value">{{ stats.cancelled }}</div>
        <div class="kpi-label">Cancelled</div>
      </div>
    </div>

    <div class="revenue">₹{{ "{:,.0f}".format(stats.revenue) }}</div>
    <p style="text-align:center;color:#64748b;font-size:13px;margin-top:-8px;">Revenue from completed services</p>

    {% if stats.top_technician %}
    <div class="section-title">⭐ Top Technician Yesterday</div>
    <div class="stat-row">
      <span class="stat-label">Name</span>
      <span class="stat-value">{{ stats.top_technician }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Jobs Completed</span>
      <span class="stat-value">{{ stats.top_tech_jobs }}</span>
    </div>
    {% endif %}

    {% if stats.pending > 0 %}
    <div style="margin-top:20px;padding:14px 16px;background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;font-size:13px;color:#92400e;">
      ⚠️ <strong>{{ stats.pending }} booking(s)</strong> are still pending and need technician assignment.
    </div>
    {% endif %}
  </div>
  <div class="footer">
    © {{ year }} CoolServ by TapNext · Daily Automated Digest · Do not reply to this email
  </div>
</div>
</body>
</html>
"""

WEEKLY_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0;}
    .container{max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#005680,#0077b3);padding:28px 32px;}
    .header h1{color:#fff;margin:0;font-size:22px;}
    .header p{color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;}
    .body{padding:28px 32px;color:#334155;}
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0;}
    .kpi-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;}
    .kpi-value{font-size:26px;font-weight:800;color:#0077b3;line-height:1;}
    .kpi-label{font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;}
    .kpi-card.green .kpi-value{color:#16a34a;}
    .kpi-card.purple .kpi-value{color:#7c3aed;}
    .section-title{font-size:14px;font-weight:700;color:#0f172a;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
    table.data{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
    table.data th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;}
    table.data td{padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#334155;}
    table.data tr:last-child td{border-bottom:none;}
    .chart-section{margin:24px 0;text-align:center;}
    .chart-section img{max-width:100%;border-radius:10px;border:1px solid #e2e8f0;}
    .revenue-big{font-size:36px;font-weight:900;color:#16a34a;text-align:center;margin:12px 0;}
    .footer{background:#f8fafc;padding:18px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>❄️ CoolServ Weekly Report</h1>
    <p>Week of {{ week_start }} — {{ week_end }} · Generated {{ now }}</p>
  </div>
  <div class="body">
    <p>Here's your complete weekly performance summary for CoolServ.</p>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">{{ stats.total }}</div>
        <div class="kpi-label">Total Bookings</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-value">{{ stats.completed }}</div>
        <div class="kpi-label">Completed</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-value">{{ stats.completion_rate }}%</div>
        <div class="kpi-label">Completion Rate</div>
      </div>
    </div>

    <div class="revenue-big">₹{{ "{:,.0f}".format(stats.revenue) }}</div>
    <p style="text-align:center;color:#64748b;font-size:13px;margin-top:-8px;">Total Revenue This Week</p>

    {% if service_breakdown %}
    <div class="section-title">📋 Service Breakdown</div>
    <table class="data">
      <thead><tr><th>Service Type</th><th>Bookings</th><th>Revenue</th></tr></thead>
      <tbody>
        {% for row in service_breakdown %}
        <tr>
          <td>{{ row.type }}</td>
          <td>{{ row.count }}</td>
          <td>₹{{ "{:,.0f}".format(row.revenue) }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
    {% endif %}

    {% if tech_performance %}
    <div class="section-title">👷 Technician Performance</div>
    <table class="data">
      <thead><tr><th>Technician</th><th>Jobs</th><th>Completed</th><th>Rating</th></tr></thead>
      <tbody>
        {% for t in tech_performance %}
        <tr>
          <td>{{ t.name }}</td>
          <td>{{ t.total }}</td>
          <td>{{ t.completed }}</td>
          <td>{% if t.rating %}⭐ {{ t.rating }}{% else %}New{% endif %}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
    {% endif %}

    {% if chart_inline %}
    <div class="chart-section">
      <div class="section-title">📊 Analytics Charts</div>
      <img src="cid:analytics_chart" alt="CoolServ Weekly Analytics" />
    </div>
    {% endif %}

    {% if stats.pending > 0 %}
    <div style="margin-top:20px;padding:14px 16px;background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;font-size:13px;color:#92400e;">
      ⚠️ <strong>{{ stats.pending }} booking(s)</strong> are still pending and require attention.
    </div>
    {% endif %}
  </div>
  <div class="footer">
    © {{ year }} CoolServ by TapNext · Weekly Automated Report · Do not reply to this email
  </div>
</div>
</body>
</html>
"""


# ── Email sender ──────────────────────────────────────────────────────────────
def _send_email(subject: str, html_body: str, chart_path: str = None) -> bool:
    admin_email = os.getenv('ADMIN_EMAIL')
    if not admin_email:
        logger.warning('ADMIN_EMAIL not set — skipping digest')
        return False

    try:
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From']    = os.getenv('SMTP_FROM', 'CoolServ Bot <noreply@coolserv.in>')
        msg['To']      = admin_email

        alt = MIMEMultipart('alternative')
        msg.attach(alt)
        alt.attach(MIMEText(html_body, 'html'))

        # Attach chart image inline if provided
        if chart_path and Path(chart_path).exists():
            with open(chart_path, 'rb') as f:
                img = MIMEImage(f.read())
                img.add_header('Content-ID', '<analytics_chart>')
                img.add_header('Content-Disposition', 'inline', filename='analytics.png')
                msg.attach(img)

        with smtplib.SMTP(os.getenv('SMTP_HOST', 'smtp.gmail.com'),
                          int(os.getenv('SMTP_PORT', 587))) as server:
            server.starttls()
            server.login(os.getenv('SMTP_USER', ''), os.getenv('SMTP_PASS', ''))
            server.send_message(msg)

        logger.info(f'📧 Digest email sent to {admin_email}: {subject}')
        return True
    except Exception as e:
        logger.error(f'Digest email error: {e}')
        return False


# ── Daily digest ──────────────────────────────────────────────────────────────
def send_daily_digest() -> None:
    logger.info('📅 Sending daily digest...')
    db = get_db()

    today          = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today - timedelta(days=1)
    yesterday_end   = today

    bookings = get_bookings_range(yesterday_start, yesterday_end)
    total     = len(bookings)
    completed = [b for b in bookings if b.get('status') == 'Completed']
    pending   = sum(1 for b in bookings if b.get('status') == 'Pending')
    cancelled = sum(1 for b in bookings if b.get('status') == 'Cancelled')
    revenue   = sum(b.get('estimatedAmount', 0) for b in completed)

    # Top technician
    tech_counts = {}
    for b in completed:
        tid = str(b.get('technicianId', ''))
        if tid and tid != 'None':
            tech_counts[tid] = tech_counts.get(tid, 0) + 1

    top_tech_name = None
    top_tech_jobs = 0
    if tech_counts:
        top_id = max(tech_counts, key=tech_counts.get)
        top_tech_jobs = tech_counts[top_id]
        from bson import ObjectId
        user_doc = None
        tech_doc = db.technicians.find_one({'_id': ObjectId(top_id)})
        if tech_doc:
            user_doc = db.users.find_one({'_id': tech_doc['userId']})
        if user_doc:
            top_tech_name = f"{user_doc.get('firstName','')} {user_doc.get('lastName','')}".strip()

    stats = {
        'date':           yesterday_start.strftime('%d %B %Y'),
        'total':          total,
        'completed':      len(completed),
        'pending':        pending,
        'cancelled':      cancelled,
        'revenue':        revenue,
        'top_technician': top_tech_name,
        'top_tech_jobs':  top_tech_jobs,
    }

    env = Environment(loader=BaseLoader())
    tmpl = env.from_string(DAILY_TEMPLATE)
    html = tmpl.render(
        stats=stats,
        now=datetime.utcnow().strftime('%d %b %Y %H:%M UTC'),
        year=datetime.utcnow().year,
    )

    _send_email(
        subject=f'[CoolServ] Daily Digest — {yesterday_start.strftime("%d %b %Y")} | {total} Bookings | ₹{revenue:,.0f}',
        html_body=html,
    )


# ── Weekly digest ─────────────────────────────────────────────────────────────
def send_weekly_digest() -> None:
    logger.info('📆 Sending weekly digest...')
    db = get_db()

    today      = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=7)

    bookings  = get_bookings_range(week_start, today)
    completed = [b for b in bookings if b.get('status') == 'Completed']
    revenue   = sum(b.get('estimatedAmount', 0) for b in completed)
    pending   = sum(1 for b in bookings if b.get('status') in ('Pending', 'Assigned'))
    comp_rate = round(len(completed) / len(bookings) * 100) if bookings else 0

    # Service breakdown
    svc_data = {}
    for b in bookings:
        svc = b.get('serviceType', 'Unknown')
        if svc not in svc_data:
            svc_data[svc] = {'count': 0, 'revenue': 0}
        svc_data[svc]['count'] += 1
        if b.get('status') == 'Completed':
            svc_data[svc]['revenue'] += b.get('estimatedAmount', 0)
    service_breakdown = [{'type': k, 'count': v['count'], 'revenue': v['revenue']}
                         for k, v in sorted(svc_data.items(), key=lambda x: -x[1]['count'])]

    # Technician performance
    tech_pipeline = [
        {'$match': {'createdAt': {'$gte': week_start}}},
        {'$group': {'_id': '$technicianId',
                    'total': {'$sum': 1},
                    'completed': {'$sum': {'$cond': [{'$eq': ['$status', 'Completed']}, 1, 0]}}}},
        {'$lookup': {'from': 'technicians', 'localField': '_id', 'foreignField': '_id', 'as': 'tech'}},
        {'$unwind': {'path': '$tech', 'preserveNullAndEmptyArrays': True}},
        {'$lookup': {'from': 'users', 'localField': 'tech.userId', 'foreignField': '_id', 'as': 'user'}},
        {'$unwind': {'path': '$user', 'preserveNullAndEmptyArrays': True}},
        {'$project': {
            'name': {'$concat': ['$user.firstName', ' ', '$user.lastName']},
            'total': 1, 'completed': 1, 'rating': '$tech.rating',
        }},
        {'$sort': {'completed': -1}},
        {'$limit': 10},
    ]
    try:
        tech_performance = [
            {'name': t.get('name', 'Unknown'), 'total': t.get('total', 0),
             'completed': t.get('completed', 0), 'rating': t.get('rating')}
            for t in db.bookings.aggregate(tech_pipeline)
            if t.get('_id') is not None
        ]
    except Exception:
        tech_performance = []

    # Generate analytics chart
    chart_path = generate_analytics_chart('/tmp/coolserv_weekly.png', days=7)

    stats = {
        'total':           len(bookings),
        'completed':       len(completed),
        'pending':         pending,
        'revenue':         revenue,
        'completion_rate': comp_rate,
    }

    env = Environment(loader=BaseLoader())
    tmpl = env.from_string(WEEKLY_TEMPLATE)
    html = tmpl.render(
        stats=stats,
        service_breakdown=service_breakdown,
        tech_performance=tech_performance,
        chart_inline=bool(chart_path),
        week_start=week_start.strftime('%d %b'),
        week_end=(today - timedelta(days=1)).strftime('%d %b %Y'),
        now=datetime.utcnow().strftime('%d %b %Y %H:%M UTC'),
        year=datetime.utcnow().year,
    )

    _send_email(
        subject=f'[CoolServ] Weekly Report — {week_start.strftime("%d %b")} to {today.strftime("%d %b %Y")} | ₹{revenue:,.0f}',
        html_body=html,
        chart_path=chart_path,
    )
