const router = require('express').Router();
const ACUnit = require('../models/ACUnit');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all units for logged-in customer
router.get('/', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.role === 'admin' && req.query.customerId
      ? req.query.customerId
      : req.user._id;
    const units = await ACUnit.find({ customerId, isActive: true }).sort({ createdAt: -1 });
    res.json(units);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const unit = await ACUnit.findById(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json(unit);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', verifyToken, requireRole('customer', 'admin'), async (req, res) => {
  try {
    const customerId = req.user.role === 'admin' && req.body.customerId ? req.body.customerId : req.user._id;
    const count = await ACUnit.countDocuments({ customerId, isActive: true });
    if (req.user.role === 'customer' && count >= 5) {
      return res.status(400).json({ message: 'Maximum 5 AC units allowed per customer' });
    }
    const { brand, model, installYear, capacity, acType, locationLabel, serialNumber } = req.body;
    const unit = await ACUnit.create({ customerId, brand, model, installYear, capacity, acType, locationLabel, serialNumber });
    res.status(201).json(unit);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const unit = await ACUnit.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!unit && req.user.role !== 'admin') return res.status(404).json({ message: 'Unit not found' });
    const updated = await ACUnit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await ACUnit.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Unit removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
