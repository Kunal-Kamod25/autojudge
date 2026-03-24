const User = require('../models/User');
const { generateTokens, verifyToken, setTokenCookies, getCookieConfig, JWT_REFRESH_SECRET } = require('../utils/jwt');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

exports.register = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { name, email, password, role } = req.body;
    // Quick guard clause so we fail fast before doing heavier work.
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role === 'teacher' ? 'teacher' : 'student', isVerified: true });
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();
    setTokenCookies(res, accessToken, refreshToken);
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    // Quick guard clause so we fail fast before doing heavier work.
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // Quick guard clause so we fail fast before doing heavier work.
    if (!await user.comparePassword(password)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    user.lastLogin = new Date();
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();
    setTokenCookies(res, accessToken, refreshToken);
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, stats: user.stats } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.refreshToken = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const token = req.cookies?.refreshToken;
    // Quick guard clause so we fail fast before doing heavier work.
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
    const decoded = verifyToken(token, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    // Quick guard clause so we fail fast before doing heavier work.
    if (!user || !user.refreshTokens.some(t => t.token === token)) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== token);
    user.refreshTokens.push({ token: newRefresh });
    await user.save();
    setTokenCookies(res, accessToken, newRefresh);
    res.json({ success: true });
  } catch (err) { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

exports.logout = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const token = req.cookies?.refreshToken;
    if (token && req.user) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== token);
      await req.user.save();
    }
    const cookieConfig = getCookieConfig();
    res.clearCookie('accessToken', cookieConfig);
    res.clearCookie('refreshToken', cookieConfig);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.oauthSuccess = async (req, res) => {
  const { accessToken, refreshToken } = generateTokens(req.user._id);
  req.user.refreshTokens.push({ token: refreshToken });
  await req.user.save();
  setTokenCookies(res, accessToken, refreshToken);
  res.redirect(`${frontendUrl}/auth/callback`);
};
