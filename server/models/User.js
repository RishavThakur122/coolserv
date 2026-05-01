const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['customer', 'admin', 'technician'], default: 'customer' },
  phone:        { type: String, trim: true },
  city:         { type: String, trim: true },
  isActive:     { type: Boolean, default: true },
  avatar:       { type: String },
}, { timestamps: true });

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Generate JWT
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Never expose password
userSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
