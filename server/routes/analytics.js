const router = require('express').Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Technician = require('../models/Technician');
const Review = require('../models/Review');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/analytics/dashboard — Admin KPIs
router.get('/dashboard', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalBookings, todayBookings, pendingBookings, completedToday,
      totalCustomers, activeTechnicians,
      thisMonthRevenue, lastMonthRevenue,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Completed', completedAt: { $gte: today } }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Technician.countDocuments({ isAvailable: true }),
      Booking.aggregate([
        { $match: { status: 'Completed', completedAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'Completed', completedAt: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } },
      ]),
    ]);

    res.json({
      totalBookings, todayBookings, pendingBookings, completedToday,
      totalCustomers, activeTechnicians,
      thisMonthRevenue: thisMonthRevenue[0]?.total || 0,
      lastMonthRevenue: lastMonthRevenue[0]?.total || 0,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/bookings-by-day?days=30
router.get('/bookings-by-day', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30');
    const since = new Date(Date.now() - days * 86400000);
    const data = await Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$estimatedAmount', 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/by-service-type
router.get('/by-service-type', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/by-status
router.get('/by-status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/technician-performance
router.get('/technician-performance', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $match: { technicianId: { $ne: null }, status: { $in: ['Completed', 'InProgress', 'Assigned'] } } },
      { $group: {
        _id: '$technicianId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, '$estimatedAmount', 0] } },
      }},
      { $lookup: { from: 'technicians', localField: '_id', foreignField: '_id', as: 'tech' } },
      { $unwind: '$tech' },
      { $lookup: { from: 'users', localField: 'tech.userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: { $concat: ['$user.firstName', ' ', '$user.lastName'] }, total: 1, completed: 1, revenue: 1, rating: '$tech.rating' } },
      { $sort: { completed: -1 } },
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/monthly-revenue
router.get('/monthly-revenue', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $match: { status: 'Completed' } },
      { $group: {
        _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } },
        revenue: { $sum: '$estimatedAmount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
