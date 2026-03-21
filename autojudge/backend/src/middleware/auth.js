const jwt = require('jsonwebtoken');
const User = require('../models/User');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

exports.protect = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(decoded.id);
    if (!req.user || !req.user.isActive) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};
