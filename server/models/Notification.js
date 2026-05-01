const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  type: {
    type: String,
enum: ['booking_confirmed', 'technician_assigned', 'service_started', 'service_completed', 'pending_approval', 'booking_cancelled', 'payment_received', 'maintenance_reminder', 'review_request'],    required: true,
  },
  subject: { type: String, required: true },
  body:     { type: String, required: true },
  isRead:   { type: Boolean, default: false },
  sentAt:   { type: Date, default: Date.now },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
