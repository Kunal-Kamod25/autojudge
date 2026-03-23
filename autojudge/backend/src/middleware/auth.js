// This file drives the auth feature flow and keeps the behavior easy to reason about.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

exports.protect = async (req, res, next) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    let token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    // Quick guard clause so we fail fast before doing heavier work.
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(decoded.id);
    // Quick guard clause so we fail fast before doing heavier work.
    if (!req.user || !req.user.isActive) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    // Quick guard clause so we fail fast before doing heavier work.
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  // Quick guard clause so we fail fast before doing heavier work.
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};
