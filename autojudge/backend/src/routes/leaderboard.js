// This file drives the leaderboard feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const { protect } = require('../middleware/auth');

// Public leaderboard
router.get('/', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { limit = 50, language } = req.query;
    let users = await User.find({ role: 'student', isActive: true })
      .sort({ 'stats.points': -1, 'stats.solved': -1 })
      .limit(+limit)
      .select('name avatar stats createdAt');

    // Add rank
    const ranked = users.map((u, i) => ({
      ...u.toObject(),
      rank: i + 1,
      badge: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i < 10 ? '⭐' : '🔵'
    }));

    res.json({ success: true, leaderboard: ranked });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// My rank
router.get('/me', protect, async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const myPoints = req.user.stats?.points || 0;
    const rank = await User.countDocuments({ role: 'student', 'stats.points': { $gt: myPoints } }) + 1;
    const total = await User.countDocuments({ role: 'student' });
    res.json({ success: true, rank, total, percentile: Math.round(((total - rank) / total) * 100) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
