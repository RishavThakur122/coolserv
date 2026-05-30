# ❄️ CoolServ Service Intelligence Bot

A standalone Python background worker that monitors bookings, generates analytics, and sends intelligent alerts — completely independent of the Node.js backend.

---

## What it does

| Module | Schedule | Action |
|---|---|---|
| `monitor.py` | Every 30 mins | Checks overdue bookings → Telegram alert + email |
| `analytics.py` | On demand | Generates 4-panel matplotlib chart as PNG |
| `digest.py` | Daily 08:00 | Sends yesterday's booking summary to admin |
| `digest.py` | Monday 09:00 | Sends full weekly report with embedded chart |
| `reminder.py` | Daily 09:00 | Sends maintenance reminders to customers |

---

## Setup

### 1. Install Python dependencies
```bash
cd bot
pip install -r requirements.txt
```

### 2. Create .env file
```bash
cp .env.example .env
# Fill in all values
```

### 3. Get Telegram Bot Token

**Step 1:** Open Telegram → search for `@BotFather` → click Start

**Step 2:** Type `/newbot` → give it a name like `CoolServ Admin` → username like `coolserv_admin_bot`

**Step 3:** BotFather gives you a token like:
```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```
→ Set as `TELEGRAM_BOT_TOKEN`

**Step 4:** Get your Chat ID:
- Search `@userinfobot` on Telegram → click Start
- It shows your numeric ID like `987654321`
- For a group: add `@userinfobot` to the group → it shows group ID (negative number like `-1001234567890`)
→ Set as `TELEGRAM_CHAT_ID`

**Step 5:** Start your bot — open Telegram → find your bot → click Start (required once)

### 4. Run locally
```bash
cd bot
python bot.py
```

You should see:
```
╔══════════════════════════════════════════════╗
║      ❄️  CoolServ Service Intelligence Bot   ║
╚══════════════════════════════════════════════╝
✅ MongoDB connection verified
📅 Scheduled jobs registered:
   • Overdue check:    every 30 minutes
   • Daily digest:     daily at 08:00
   • Weekly digest:    monday at 09:00
🚀 Bot is running.
```

---

## Deploy on Render (Free Background Worker)

1. Go to **render.com** → New + → **Background Worker**
2. Connect your GitHub repo
3. Settings:
   ```
   Name:           coolserv-bot
   Root Directory: bot
   Runtime:        Python 3
   Build Command:  pip install -r requirements.txt
   Start Command:  python bot.py
   ```
4. Add all environment variables from `.env.example`
5. Click **Create Background Worker**

Render will keep it running 24/7 at zero cost.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | Same MongoDB Atlas URI as server |
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ | Your Telegram user/group ID |
| `SMTP_USER` | ✅ | Gmail address |
| `SMTP_PASS` | ✅ | Gmail App Password |
| `ADMIN_EMAIL` | ✅ | Where digest emails are sent |
| `NODE_API_URL` | ✅ | Render backend URL |
| `OVERDUE_THRESHOLD_HOURS` | Optional | Default: 2 |
| `SERVICE_REMINDER_DAYS` | Optional | Default: 90 |
| `FULL_SERVICE_REMINDER_DAYS` | Optional | Default: 365 |

---

## What you'll receive

### Telegram Alert (overdue booking)
```
⚠️ CoolServ: 2 Overdue Booking(s)

• #AB1234 — Repair (Assigned)
  🕐 3h 20m overdue
• #CD5678 — Maintenance (InProgress)
  🕐 1h 45m overdue

👉 Log in to admin panel to take action.
```

### Daily Digest Email
- Total / Completed / Pending / Cancelled counts
- Revenue from completed services
- Top performing technician

### Weekly Report Email
- Full week KPI summary
- Service type breakdown table
- Technician performance table
- Embedded 4-panel analytics chart PNG

### Maintenance Reminder Email (to customer)
- AC unit details
- Last service date
- Recommended service type
- CTA to book online
