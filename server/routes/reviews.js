// reviews.js
const router = require('express').Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/technician/:techId', verifyToken, async (req, res) => {
  try {
    const reviews = await Review.find({ technicianId: req.params.techId })
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const review = await Review.findOne({ bookingId: req.params.bookingId });
    res.json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const { bookingId, rating, comment, tags } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id, status: 'Completed' });
    if (!booking) return res.status(400).json({ message: 'Only completed bookings can be reviewed' });

    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(409).json({ message: 'Review already submitted for this booking' });

    const tech = await Technician.findById(booking.technicianId);
    const review = await Review.create({ bookingId, customerId: req.user._id, technicianId: tech._id, rating, comment, tags });
    res.status(201).json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
