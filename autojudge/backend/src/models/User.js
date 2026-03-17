const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false, minlength: 6 },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  phone: { type: String, default: '' },
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  googleId: String,
  githubId: String,
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  stats: {
    totalSubmissions: { type: Number, default: 0 },
    solved: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    rank: { type: String, default: 'Beginner' }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(p) {
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);
