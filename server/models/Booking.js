const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  unitId:       { type: mongoose.Schema.Types.ObjectId, ref: 'ACUnit',     required: true },
  serviceType:  { type: String, enum: ['Installation', 'Maintenance', 'Repair', 'GasRefill'], required: true },
  status: {
    type: String,
enum: ['Pending','Assigned','InProgress','PendingApproval','Completed','Cancelled'],    default: 'Pending',
  },
  scheduledDate:    { type: Date, required: true },
  timeSlot:         { type: String, required: true }, // e.g. "10:00–12:00"
  address:          { type: String, required: true },
  customerNotes:    { type: String, default: '' },
  technicianNotes:  { type: String, default: '' },
  cancelReason:     { type: String, default: '' },
  completedAt:      { type: Date },
  estimatedAmount:  { type: Number, default: 0 },
  paymentStatus:    { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
  paymentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
}, { timestamps: true });

// Indexes
bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ technicianId: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1, scheduledDate: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
