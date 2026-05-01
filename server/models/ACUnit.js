const mongoose = require('mongoose');

const acUnitSchema = new mongoose.Schema({
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand:         { type: String, required: true, trim: true },
  model:         { type: String, required: true, trim: true },
  installYear:   { type: Number },
  capacity:      { type: String, enum: ['0.75 Ton', '1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', 'Other'] },
  acType:        { type: String, enum: ['Split', 'Window', 'Portable', 'Cassette', 'Ducted'] },
  locationLabel: { type: String, trim: true }, // e.g. "Master Bedroom", "Living Room"
  serialNumber:  { type: String, trim: true },
  lastServiceDate: { type: Date },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ACUnit', acUnitSchema);
