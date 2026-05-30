"""
analytics.py — CoolServ Bot: Analytics Chart Generator
Reads booking data from MongoDB via pymongo.
Generates a 4-panel matplotlib figure:
  Panel 1: Bookings per day of week (bar)
  Panel 2: Service type distribution (pie)
  Panel 3: Technician workload (horizontal bar)
  Panel 4: Peak booking hours (bar)
Saves as PNG and returns file path for email attachment.
"""
import os
import logging
from datetime import datetime, timedelta
from collections import Counter

import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server use
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec

from bot.db import get_db, get_bookings_range
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# CoolServ brand colours
COLORS = {
    'primary':    '#00bcff',
    'secondary':  '#0077b3',
    'success':    '#22c55e',
    'warning':    '#f59e0b',
    'danger':     '#ef4444',
    'purple':     '#a855f7',
    'bg':         '#1a2235',
    'card':       '#1e2a3a',
    'text':       '#f1f5f9',
    'muted':      '#94a3b8',
    'grid':       '#2d3f5e',
}

SERVICE_COLORS = {
    'Maintenance':  '#00bcff',
    'Repair':       '#f59e0b',
    'Installation': '#22c55e',
    'GasRefill':    '#a855f7',
}

DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']


def _setup_dark_style():
    plt.rcParams.update({
        'figure.facecolor':  COLORS['bg'],
        'axes.facecolor':    COLORS['card'],
        'axes.edgecolor':    COLORS['grid'],
        'axes.labelcolor':   COLORS['muted'],
        'axes.titlecolor':   COLORS['text'],
        'xtick.color':       COLORS['muted'],
        'ytick.color':       COLORS['muted'],
        'text.color':        COLORS['text'],
        'grid.color':        COLORS['grid'],
        'grid.alpha':        0.4,
        'font.family':       'DejaVu Sans',
        'font.size':         10,
    })


def generate_analytics_chart(output_path: str = '/tmp/coolserv_analytics.png',
                               days: int = 30) -> str:
    """Generate the 4-panel analytics chart and return the output path."""
    logger.info(f'📊 Generating analytics chart (last {days} days)...')
    _setup_dark_style()

    # ── Fetch data ────────────────────────────────────────────────────────────
    since = datetime.utcnow() - timedelta(days=days)
    try:
        bookings = get_bookings_range(since, datetime.utcnow())
    except Exception as e:
        logger.error(f'Analytics DB error: {e}')
        return None

    if not bookings:
        logger.warning('No bookings found for analytics chart')
        return _generate_empty_chart(output_path, days)

    df = pd.DataFrame(bookings)
    df['scheduledDate'] = pd.to_datetime(df['scheduledDate'], utc=True)
    df['day_name']      = df['scheduledDate'].dt.day_name()
    df['hour']          = df['scheduledDate'].dt.hour
    df['serviceType']   = df['serviceType'].fillna('Unknown')

    # ── Figure setup ──────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(16, 12), facecolor=COLORS['bg'])
    fig.suptitle(
        f'❄️  CoolServ Analytics  ·  Last {days} Days  ·  {datetime.utcnow().strftime("%d %b %Y")}',
        fontsize=16, fontweight='bold', color=COLORS['text'], y=0.98,
    )
    gs = GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.35,
                  left=0.08, right=0.95, top=0.92, bottom=0.08)

    # ── Panel 1: Bookings per day of week ─────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    day_counts = df['day_name'].value_counts().reindex(DAY_ORDER, fill_value=0)
    bars = ax1.bar(
        [d[:3] for d in DAY_ORDER],
        day_counts.values,
        color=[COLORS['primary']] * 7,
        edgecolor=COLORS['grid'],
        linewidth=0.5,
        width=0.6,
    )
    # Highlight highest bar
    max_idx = day_counts.values.argmax()
    bars[max_idx].set_color(COLORS['success'])
    ax1.set_title('Bookings by Day of Week', fontweight='bold', pad=12)
    ax1.set_ylabel('Bookings', color=COLORS['muted'])
    ax1.grid(axis='y', alpha=0.3)
    ax1.set_axisbelow(True)
    for bar in bars:
        if bar.get_height() > 0:
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                     str(int(bar.get_height())), ha='center', va='bottom',
                     fontsize=9, color=COLORS['text'])

    # ── Panel 2: Service type pie ──────────────────────────────────────────────
    ax2 = fig.add_subplot(gs[0, 1])
    type_counts = df['serviceType'].value_counts()
    colors_pie  = [SERVICE_COLORS.get(t, COLORS['muted']) for t in type_counts.index]
    wedges, texts, autotexts = ax2.pie(
        type_counts.values,
        labels=None,
        colors=colors_pie,
        autopct='%1.0f%%',
        startangle=90,
        pctdistance=0.75,
        wedgeprops={'edgecolor': COLORS['bg'], 'linewidth': 2},
    )
    for at in autotexts:
        at.set_color(COLORS['text'])
        at.set_fontsize(9)
    ax2.set_title('Service Type Distribution', fontweight='bold', pad=12)
    legend_patches = [mpatches.Patch(color=SERVICE_COLORS.get(t, COLORS['muted']),
                                     label=f'{t} ({c})')
                      for t, c in type_counts.items()]
    ax2.legend(handles=legend_patches, loc='lower center', bbox_to_anchor=(0.5, -0.18),
               ncol=2, fontsize=8, framealpha=0.2, labelcolor=COLORS['text'])

    # ── Panel 3: Technician workload ──────────────────────────────────────────
    ax3 = fig.add_subplot(gs[1, 0])
    db = get_db()
    tech_pipeline = [
        {'$match': {'technicianId': {'$ne': None}}},
        {'$group': {'_id': '$technicianId', 'count': {'$sum': 1}}},
        {'$lookup': {'from': 'technicians', 'localField': '_id', 'foreignField': '_id', 'as': 'tech'}},
        {'$unwind': {'path': '$tech', 'preserveNullAndEmptyArrays': True}},
        {'$lookup': {'from': 'users', 'localField': 'tech.userId', 'foreignField': '_id', 'as': 'user'}},
        {'$unwind': {'path': '$user', 'preserveNullAndEmptyArrays': True}},
        {'$project': {'name': {'$concat': ['$user.firstName', ' ', '$user.lastName']}, 'count': 1}},
        {'$sort': {'count': -1}},
        {'$limit': 8},
    ]
    try:
        tech_data = list(db.bookings.aggregate(tech_pipeline))
    except Exception:
        tech_data = []

    if tech_data:
        names  = [d.get('name', 'Unknown')[:12] for d in tech_data]
        counts = [d.get('count', 0) for d in tech_data]
        colors_bar = [COLORS['purple']] * len(names)
        colors_bar[0] = COLORS['warning']  # Highlight top technician
        bars3 = ax3.barh(names[::-1], counts[::-1], color=colors_bar[::-1],
                         edgecolor=COLORS['grid'], linewidth=0.5, height=0.6)
        ax3.set_title('Technician Workload (Top 8)', fontweight='bold', pad=12)
        ax3.set_xlabel('Jobs Assigned', color=COLORS['muted'])
        ax3.grid(axis='x', alpha=0.3)
        ax3.set_axisbelow(True)
        for bar in bars3:
            if bar.get_width() > 0:
                ax3.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                         str(int(bar.get_width())), va='center', fontsize=9, color=COLORS['text'])
    else:
        ax3.text(0.5, 0.5, 'No technician data yet', ha='center', va='center',
                 transform=ax3.transAxes, color=COLORS['muted'], fontsize=12)
        ax3.set_title('Technician Workload', fontweight='bold', pad=12)

    # ── Panel 4: Peak booking hours heatmap ───────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 1])
    hour_counts = df['hour'].value_counts().sort_index()
    all_hours   = pd.Series(0, index=range(24))
    all_hours.update(hour_counts)

    # Color by intensity
    max_val = all_hours.max() if all_hours.max() > 0 else 1
    bar_colors = [plt.cm.Blues(0.2 + 0.8 * v/max_val) for v in all_hours.values]

    bars4 = ax4.bar(all_hours.index, all_hours.values, color=bar_colors,
                    edgecolor=COLORS['grid'], linewidth=0.3, width=0.8)
    ax4.set_title('Peak Booking Hours', fontweight='bold', pad=12)
    ax4.set_xlabel('Hour of Day (0–23)', color=COLORS['muted'])
    ax4.set_ylabel('Bookings', color=COLORS['muted'])
    ax4.set_xticks(range(0, 24, 2))
    ax4.grid(axis='y', alpha=0.3)
    ax4.set_axisbelow(True)

    # Mark peak hour
    if all_hours.max() > 0:
        peak_hour = all_hours.idxmax()
        ax4.axvline(x=peak_hour, color=COLORS['warning'], linestyle='--', alpha=0.7, linewidth=1.5)
        ax4.text(peak_hour + 0.3, all_hours.max() * 0.9,
                 f'Peak: {peak_hour:02d}:00', color=COLORS['warning'], fontsize=8)

    # ── Summary stats footer ──────────────────────────────────────────────────
    total      = len(df)
    completed  = len(df[df.get('status', pd.Series()) == 'Completed']) if 'status' in df.columns else 0
    revenue    = df[df.get('status') == 'Completed']['estimatedAmount'].sum() if 'estimatedAmount' in df.columns else 0

    fig.text(0.5, 0.01,
             f'Total Bookings: {total}   |   Completed: {completed}   |   '
             f'Revenue: ₹{revenue:,.0f}   |   Generated: {datetime.utcnow().strftime("%d %b %Y %H:%M")} UTC',
             ha='center', fontsize=9, color=COLORS['muted'])

    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close('all')
    logger.info(f'✅ Analytics chart saved to {output_path}')
    return output_path


def _generate_empty_chart(output_path: str, days: int) -> str:
    """Generate a placeholder chart when no data is available."""
    _setup_dark_style()
    fig, ax = plt.subplots(figsize=(10, 6), facecolor=COLORS['bg'])
    ax.set_facecolor(COLORS['card'])
    ax.text(0.5, 0.5, f'No booking data available\nfor the last {days} days',
            ha='center', va='center', transform=ax.transAxes,
            color=COLORS['muted'], fontsize=14)
    ax.set_title('❄️  CoolServ Analytics', color=COLORS['text'], fontsize=14, pad=20)
    ax.axis('off')
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close('all')
    return output_path
