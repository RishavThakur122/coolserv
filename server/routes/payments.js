const router = require('express').Router();
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const notify = require('../services/notificationService');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/payments/create-order
router.post('/create-order', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.paymentStatus === 'Paid') return res.status(400).json({ message: 'Already paid' });

    const amountPaise = booking.estimatedAmount * 100;

    // Try Razorpay if configured
    let razorpayOrderId = null;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        const order = await rzp.orders.create({ amount: amountPaise, currency: 'INR', receipt: bookingId });
        razorpayOrderId = order.id;
      } catch (e) { console.error('Razorpay order creation failed:', e.message); }
    }

    const payment = await Payment.create({
      bookingId,
      customerId: req.user._id,
      amount: amountPaise,
      razorpayOrderId,
    });

    res.json({
      paymentId: payment._id,
      razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/payments/verify — Verify Razorpay signature
router.post('/verify', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Verify signature
    let verified = false;
    if (process.env.RAZORPAY_KEY_SECRET && razorpaySignature) {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      verified = expectedSig === razorpaySignature;
    } else {
      // Demo mode: accept any payment
      verified = true;
    }

    if (!verified) return res.status(400).json({ message: 'Payment verification failed' });

    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.paidAt = new Date();
    await payment.save();

    const booking = await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'Paid',
      paymentId: payment._id,
    }, { new: true });

    const customer = await User.findById(req.user._id);
    notify.sendPaymentReceived(booking, customer, payment).catch(console.error);

    res.json({ message: 'Payment verified', payment });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/payments/booking/:bookingId
router.get('/booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/payments/refund (Admin)
router.post('/refund', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const payment = await Payment.findByIdAndUpdate(paymentId, {
      status: 'refunded', refundedAt: new Date(), refundReason: reason,
    }, { new: true });
    await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'Refunded' });
    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
