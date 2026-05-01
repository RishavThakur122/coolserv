require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  credentials: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/technicians',   require('./routes/technicians'));
app.use('/api/units',         require('./routes/units'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/payments',      require('./routes/payments'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── Database + Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const DEFAULT_DB = 'mongodb://127.0.0.1:27017/coolserv';
const mongoUri = process.env.MONGO_URI || DEFAULT_DB;

async function connectAndStart() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 CoolServ API running on port ${PORT}`));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    if (mongoUri !== DEFAULT_DB) {
      console.warn(`⚠️ Falling back to local MongoDB: ${DEFAULT_DB}`);
      try {
        await mongoose.connect(DEFAULT_DB);
        console.log('✅ Local MongoDB connected');
        app.listen(PORT, () => console.log(`🚀 CoolServ API running on port ${PORT}`));
        return;
      } catch (fallbackErr) {
        console.error('❌ Local MongoDB connection error:', fallbackErr.message);
      }
    }

    process.exit(1);
  }
}

connectAndStart();

module.exports = app;
