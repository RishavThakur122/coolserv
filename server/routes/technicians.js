const router = require('express').Router();
const Technician = require('../models/Technician');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/technicians — Admin: all technicians
router.get('/', verifyToken, requireRole('admin', 'customer'), async (req, res) => {
  try {
    const techs = await Technician.find().populate('userId', 'firstName lastName email phone isActive');
    res.json(techs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/technicians/available?date=&slot=&serviceType=
router.get('/available', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { date, slot, serviceType } = req.query;
    const allTechs = await Technician.find({ isAvailable: true }).populate('userId', 'firstName lastName phone');

    const available = [];
    for (const tech of allTechs) {
      const clash = await Booking.findOne({
        technicianId: tech._id,
        scheduledDate: new Date(date),
        timeSlot: slot,
        status: { $nin: ['Cancelled', 'Completed'] },
      });
      if (!clash) {
        // Filter by specialization if provided
        if (!serviceType || tech.specializations.includes(serviceType) || tech.specializations.includes('General')) {
          available.push(tech);
        }
      }
    }
    res.json(available);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/technicians/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const tech = await Technician.findById(req.params.id).populate('userId', 'firstName lastName email phone');
    if (!tech) return res.status(404).json({ message: 'Technician not found' });
    res.json(tech);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/technicians/:id/schedule
router.get('/:id/schedule', verifyToken, requireRole('admin', 'technician'), async (req, res) => {
  try {
    const bookings = await Booking.find({ technicianId: req.params.id, status: { $nin: ['Cancelled'] } })
      .populate('customerId', 'firstName lastName phone')
      .populate('unitId', 'brand model locationLabel')
      .sort({ scheduledDate: 1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/technicians — Admin creates technician account
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, specializations, experience, employeeId } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.create({ firstName, lastName, email, passwordHash: password || 'TapNext@123', phone, role: 'technician' });
    const tech = await Technician.create({ userId: user._id, specializations, experience, employeeId });

    const populated = await Technician.findById(tech._id).populate('userId', 'firstName lastName email phone');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/technicians/:id — Admin updates technician
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { specializations, isAvailable, experience } = req.body;
    const tech = await Technician.findByIdAndUpdate(req.params.id, { specializations, isAvailable, experience }, { new: true })
      .populate('userId', 'firstName lastName email phone');
    if (!tech) return res.status(404).json({ message: 'Technician not found' });

    // Update user fields if provided
    if (req.body.phone || req.body.firstName || req.body.lastName) {
      await User.findByIdAndUpdate(tech.userId._id, {
        phone: req.body.phone, firstName: req.body.firstName, lastName: req.body.lastName,
      });
    }

    res.json(tech);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/technicians/:id/toggle — Admin toggles availability
router.patch('/:id/toggle', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const tech = await Technician.findById(req.params.id);
    if (!tech) return res.status(404).json({ message: 'Not found' });
    tech.isAvailable = !tech.isAvailable;
    await tech.save();
    res.json(tech);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
