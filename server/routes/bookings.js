const router = require('express').Router();
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const ACUnit = require('../models/ACUnit');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');
const notify = require('../services/notificationService');

// Service pricing (INR)
const SERVICE_PRICES = {
  Installation: 2500,
  Maintenance:  800,
  Repair:       1200,
  GasRefill:    1500,
};

// GET /api/bookings — Admin: all; Customer: own; Technician: assigned
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') query.customerId = req.user._id;
    if (req.user.role === 'technician') {
      const tech = await Technician.findOne({ userId: req.user._id });
      if (!tech) return res.json([]);
      query.technicianId = tech._id;
    }
    // Optional filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.serviceType) query.serviceType = req.query.serviceType;
    if (req.query.date) {
      const d = new Date(req.query.date);
      query.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }

    const bookings = await Booking.find(query)
      .populate('customerId', 'firstName lastName email phone')
      .populate({ path: 'technicianId', populate: { path: 'userId', select: 'firstName lastName phone' } })
      .populate('unitId', 'brand model capacity acType locationLabel')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'firstName lastName email phone city')
      .populate({ path: 'technicianId', populate: { path: 'userId', select: 'firstName lastName phone' } })
      .populate('unitId')
      .populate('paymentId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings — Customer creates booking
router.post('/', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const { unitId, serviceType, scheduledDate, timeSlot, address, customerNotes } = req.body;

    // Validate AC unit belongs to customer
    const unit = await ACUnit.findOne({ _id: unitId, customerId: req.user._id });
    if (!unit) return res.status(400).json({ message: 'AC unit not found' });

    // Check customer doesn't already have a booking on same date/slot
    const clash = await Booking.findOne({
      customerId: req.user._id,
      scheduledDate: new Date(scheduledDate),
      timeSlot,
      status: { $nin: ['Cancelled', 'Completed'] },
    });
    if (clash) return res.status(409).json({ message: 'You already have a booking at this date/time slot' });

    const booking = await Booking.create({
      customerId: req.user._id,
      unitId,
      serviceType,
      scheduledDate: new Date(scheduledDate),
      timeSlot,
      address,
      customerNotes,
      estimatedAmount: SERVICE_PRICES[serviceType] || 0,
    });

    // Send confirmation email
    notify.sendBookingConfirmation(booking, req.user).catch(console.error);

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/bookings/:id/assign — Admin assigns technician
router.put('/:id/assign', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { technicianId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const tech = await Technician.findById(technicianId).populate('userId');
    if (!tech) return res.status(404).json({ message: 'Technician not found' });

    // Check slot conflict for this technician
    const clash = await Booking.findOne({
      technicianId,
      scheduledDate: booking.scheduledDate,
      timeSlot: booking.timeSlot,
      status: { $nin: ['Cancelled', 'Completed'] },
      _id: { $ne: booking._id },
    });
    if (clash) return res.status(409).json({ message: 'Technician already booked at this slot' });

    booking.technicianId = technicianId;
    booking.status = 'Assigned';
    await booking.save();

    const customer = await User.findById(booking.customerId);
    notify.sendTechnicianAssigned(booking, customer, tech).catch(console.error);

    const populated = await Booking.findById(booking._id)
      .populate('customerId', 'firstName lastName email phone')
      .populate({ path: 'technicianId', populate: { path: 'userId', select: 'firstName lastName phone' } })
      .populate('unitId');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/bookings/:id/status — Admin or Technician updates status
router.put('/:id/status', verifyToken, requireRole('admin', 'technician'), async (req, res) => {
  try {
    const { status, technicianNotes } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Valid transitions
    const transitions = {
  Pending: ['Assigned', 'Cancelled'],
  Assigned: ['InProgress', 'Cancelled'],
  InProgress: ['PendingApproval', 'Cancelled'],
  PendingApproval: ['Completed', 'Cancelled'],
};
    if (transitions[booking.status] && !transitions[booking.status].includes(status)) {
      return res.status(400).json({ message: `Cannot transition from ${booking.status} to ${status}` });
    }

    booking.status = status;
    if (technicianNotes) booking.technicianNotes = technicianNotes;
    if (status === 'Completed') booking.completedAt = new Date();
    await booking.save();

   if (status === 'PendingApproval') {
  const customer = await User.findById(booking.customerId);
  notify.sendPendingApproval(booking, customer).catch(console.error);
}

if (status === 'Completed') {
  booking.completedAt = new Date();
  await booking.save();
  const customer = await User.findById(booking.customerId);
  notify.sendServiceCompleted(booking, customer).catch(console.error);
  await ACUnit.findByIdAndUpdate(booking.unitId, { lastServiceDate: new Date() });
}
    if (status === 'Cancelled' && req.body.cancelReason) {
      booking.cancelReason = req.body.cancelReason;
      await booking.save();
      const customer = await User.findById(booking.customerId);
      notify.sendCancellationNotice(booking, customer).catch(console.error);
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PATCH /api/bookings/:id/approve — Customer approves job completion
router.patch('/:id/approve', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      customerId: req.user._id,
      status: 'PendingApproval'
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not pending approval' });
    
    booking.status = 'Completed';
    booking.completedAt = new Date();
    await booking.save();

    notify.sendServiceCompleted(booking, req.user).catch(console.error);
    await ACUnit.findByIdAndUpdate(booking.unitId, { lastServiceDate: new Date() });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// DELETE /api/bookings/:id/cancel — Customer cancels their own booking
router.patch('/:id/cancel', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (['Completed', 'Cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled booking' });
    }
    booking.status = 'Cancelled';
    booking.cancelReason = req.body.reason || 'Cancelled by customer';
    await booking.save();
    notify.sendCancellationNotice(booking, req.user).catch(console.error);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
