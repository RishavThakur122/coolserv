const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specializations: [{ type: String, enum: ['Installation', 'Maintenance', 'Repair', 'GasRefill', 'General'] }],
  isAvailable:     { type: Boolean, default: true },
  employeeId:      { type: String, unique: true },
  experience:      { type: Number, default: 0 }, // years
  rating:          { type: Number, default: 0, min: 0, max: 5 },
  totalJobs:       { type: Number, default: 0 },
  currentBookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
}, { timestamps: true });

// Check availability on a date+slot
technicianSchema.methods.checkAvailability = async function (date, slot) {
  const Booking = mongoose.model('Booking');
  const clash = await Booking.findOne({
    technicianId: this._id,
    scheduledDate: date,
    timeSlot: slot,
    status: { $nin: ['Cancelled', 'Completed'] },
  });
  return !clash;
};

module.exports = mongoose.model('Technician', technicianSchema);
