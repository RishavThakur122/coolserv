# ❄️ CoolServ — Service Management System

> A full-stack MERN application for managing AC service operations. Built for MCA Final Year Project at Chitkara University, Intern at TapNext.
> **Phase 1 + Phase 2 complete** — includes analytics, Razorpay payments, customer reviews, and Python-ready architecture.

---

## 🗂 Project Structure

```
coolserv/
├── server/          # Node.js + Express REST API
│   ├── models/      # Mongoose schemas
│   ├── routes/      # Express route handlers
│   ├── services/    # Nodemailer notification service
│   ├── middleware/  # JWT auth + RBAC
│   ├── seed.js      # Database seeder
│   └── server.js    # Entry point
└── client/          # React.js SPA (Vite)
    └── src/
        ├── pages/   # customer/, admin/, technician/, auth/
        ├── components/
        ├── context/ # AuthContext
        └── utils/   # Axios instance
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd server
cp .env.example .env        # Fill in your MONGO_URI, JWT_SECRET, SMTP config
npm install
node seed.js                # Seed demo data
npm run dev                 # Starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
cp .env.example .env        # Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # Starts on http://localhost:3000
```

---

## 🔐 Demo Credentials

| Role       | Email                   | Password      |
|------------|-------------------------|---------------|
| Admin      | admin@coolserv.in       | admin123      |
| Customer   | customer@coolserv.in    | customer123   |
| Technician | tech@coolserv.in        | tech123       |

---

## 🌐 API Endpoints

| Resource       | Base Path             | Key Operations |
|----------------|-----------------------|----------------|
| Auth           | `/api/auth`           | register, login, me, profile, change-password |
| Bookings       | `/api/bookings`       | CRUD, assign, status update, cancel |
| Technicians    | `/api/technicians`    | CRUD, available, schedule, toggle |
| Customers      | `/api/customers`      | list, detail, toggle |
| AC Units       | `/api/units`          | CRUD per customer |
| Notifications  | `/api/notifications`  | inbox, mark read |
| Analytics      | `/api/analytics`      | dashboard, by-day, by-type, technician-perf, revenue |
| Reviews        | `/api/reviews`        | create, by-technician, by-booking |
| Payments       | `/api/payments`       | create-order, verify, refund (Razorpay) |

---

## ✅ Phase 1 Features

- [x] JWT auth + bcrypt (Customer, Admin, Technician roles)
- [x] Multi-step service booking form (4 steps)
- [x] Slot conflict detection
- [x] Admin technician assignment with availability check
- [x] Status pipeline: Pending → Assigned → InProgress → Completed → Cancelled
- [x] Nodemailer email notifications for all booking events
- [x] Customer portal: dashboard, bookings, AC unit manager, notification inbox
- [x] Admin panel: booking manager, technician roster, customer directory
- [x] Technician portal: job list, job detail, status update with notes
- [x] MongoDB Atlas with 5 collections + compound indexes
- [x] Responsive dark UI (Tailwind CSS + React)

## ✅ Phase 2 Features

- [x] Analytics dashboard with Recharts (bar, line, pie, donut charts)
- [x] Revenue tracking and monthly trend analysis
- [x] Technician performance analytics
- [x] Razorpay payment gateway integration
- [x] Customer reviews & ratings with technician score update
- [x] Booking cancellation flow

## 📋 Phase 2 Planned (future)

- [ ] Technician GPS live tracking (Google Maps / Leaflet.js)
- [ ] Push notifications (FCM / OneSignal)
- [ ] SMS reminders (Twilio)
- [ ] Mobile app (React Native)
- [ ] Multi-branch / franchise support

---

## ☁️ Deployment

| Service     | Platform     |
|-------------|--------------|
| Backend API | Render       |
| Frontend    | Vercel       |
| Database    | MongoDB Atlas |

---

## 🛠 Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, react-hot-toast, date-fns, lucide-react  
**Backend:** Node.js 20, Express 4, Mongoose 8, JWT, bcrypt, Nodemailer, express-validator, Razorpay  
**Database:** MongoDB Atlas  
**Dev Tools:** Postman, Git, VS Code

---

*Rishav Thakur · Roll No. 2410987114 · Chitkara University MCA · Intern at TapNext*
