const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',    required: true, unique: true },
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  rating:       { type: Number, required: true, min: 1, max: 5 },
  comment:      { type: String, trim: true, maxlength: 1000 },
  tags:         [{ type: String, enum: ['Punctual', 'Professional', 'Thorough', 'Friendly', 'Value for Money'] }],
  isPublished:  { type: Boolean, default: true },
}, { timestamps: true });

// After saving, update technician's average rating
reviewSchema.post('save', async function () {
  const Technician = mongoose.model('Technician');
  const reviews = await mongoose.model('Review').find({ technicianId: this.technicianId });
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Technician.findByIdAndUpdate(this.technicianId, {
    rating: Math.round(avg * 10) / 10,
    totalJobs: reviews.length,
  });
});

module.exports = mongoose.model('Review', reviewSchema);
