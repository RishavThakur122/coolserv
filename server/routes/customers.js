// customers.js
const router = require('express').Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
    // Attach booking counts
    const result = await Promise.all(customers.map(async (c) => {
      const total = await Booking.countDocuments({ customerId: c._id });
      const completed = await Booking.countDocuments({ customerId: c._id, status: 'Completed' });
      return { ...c.toJSON(), bookingCount: total, completedCount: completed };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });
    const bookings = await Booking.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    res.json({ customer, bookings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/toggle', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
