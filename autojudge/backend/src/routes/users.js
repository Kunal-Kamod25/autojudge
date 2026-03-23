// This file drives the users feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/leaderboard', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const users = await User.find({ role: 'student', isActive: true }).sort('-stats.points -stats.solved').limit(50).select('name avatar stats');
    res.json({ success: true, leaderboard: users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/profile/:id', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const user = await User.findById(req.params.id).select('-refreshTokens');
    // Quick guard clause so we fail fast before doing heavier work.
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    const recentSubs = await Submission.find({ student: user._id }).sort('-createdAt').limit(5).select('language verdict score createdAt');
    res.json({ success: true, user, recentSubmissions: recentSubs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/profile', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { name, avatar, bio, phone, github, linkedin } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim().slice(0, 100);
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio.slice(0, 300);
    if (phone !== undefined) updates.phone = phone.slice(0, 20);
    if (github !== undefined) updates.github = github.slice(0, 100);
    if (linkedin !== undefined) updates.linkedin = linkedin.slice(0, 100);
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-refreshTokens');
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/students', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const students = await User.find({ role: 'student' }).select('name email stats createdAt lastLogin');
    res.json({ success: true, students });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});



router.put('/password', protect, async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    // Quick guard clause so we fail fast before doing heavier work.
    if (!user.password) return res.status(400).json({ success: false, message: 'OAuth account - no password' });
    // Quick guard clause so we fail fast before doing heavier work.
    if (!await user.comparePassword(currentPassword)) return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
