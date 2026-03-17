const User = require('../models/User');
const crypto = require('crypto');
const { generateTokens, verifyToken, setTokenCookies } = require('../utils/jwt');
const { sendOTPEmail } = require('../services/emailService');

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role === 'teacher' ? 'teacher' : 'student', isVerified: true });
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();
    setTokenCookies(res, accessToken, refreshToken);
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }, accessToken });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!await user.comparePassword(password)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    user.lastLogin = new Date();
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();
    setTokenCookies(res, accessToken, refreshToken);
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, stats: user.stats }, accessToken });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
    const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.some(t => t.token === token)) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== token);
    user.refreshTokens.push({ token: newRefresh });
    await user.save();
    setTokenCookies(res, accessToken, newRefresh);
    res.json({ success: true, accessToken });
  } catch (err) { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token && req.user) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== token);
      await req.user.save();
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, avatar: req.user.avatar, bio: req.user.bio, phone: req.user.phone, github: req.user.github, linkedin: req.user.linkedin, stats: req.user.stats, isVerified: req.user.isVerified } });
};

exports.oauthSuccess = async (req, res) => {
  const { accessToken, refreshToken } = generateTokens(req.user._id);
  req.user.refreshTokens.push({ token: refreshToken });
  await req.user.save();
  setTokenCookies(res, accessToken, refreshToken);
  res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${accessToken}`);
};

// ─── Forgot Password Flow ─────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });
    if (!user.password && (user.googleId || user.githubId)) {
      return res.status(400).json({ success: false, message: 'This account uses OAuth sign-in. Password reset is not available.' });
    }
    const otp = generateOTP();
    user.otp = await require('bcryptjs').hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();
    await sendOTPEmail(user.email, otp, user.name);
    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+otp +otpExpires');
    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'No OTP request found. Please request a new code.' });
    }
    if (user.otpExpires < new Date()) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }
    const isValid = await require('bcryptjs').compare(otp, user.otp);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid verification code' });
    // Generate a short-lived reset token
    const resetToken = require('jsonwebtoken').sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Code verified', resetToken });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ success: false, message: 'Token and password required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const decoded = require('jsonwebtoken').verify(resetToken, process.env.JWT_SECRET || 'secret');
    if (decoded.purpose !== 'password-reset') return res.status(400).json({ success: false, message: 'Invalid reset token' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();
    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ success: false, message: 'Reset token has expired. Please start over.' });
    res.status(500).json({ success: false, message: err.message });
  }
};
