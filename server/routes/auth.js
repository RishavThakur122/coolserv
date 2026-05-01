const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Technician = require('../models/Technician');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { firstName, lastName, email, password, phone, city } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash: password,
      phone,
      city,
      role: 'customer',
    });

    await user.save();

    const token = user.generateJWT();
    res.status(201).json({ token, user });
  } catch (err) {
    console.log(err.message);
    console.error('Register error:', err);
    res.status(500).json({ message: err.message });
  }
});
// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = user.generateJWT();

    // If technician, attach technician profile
    let technicianProfile = null;
    if (user.role === 'technician') {
      technicianProfile = await Technician.findOne({ userId: user._id });
    }

    res.json({ token, user, technicianProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  let technicianProfile = null;
  if (req.user.role === 'technician') {
    technicianProfile = await Technician.findOne({ userId: req.user._id });
  }
  res.json({ user: req.user, technicianProfile });
});

// PATCH /api/auth/profile
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, city } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone, city },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ message: 'Current password incorrect' });
    user.passwordHash = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
