const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  amount:            { type: Number, required: true }, // in paise (INR)
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  method:            { type: String }, // card, upi, netbanking, etc.
  paidAt:            { type: Date },
  refundedAt:        { type: Date },
  refundReason:      { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
