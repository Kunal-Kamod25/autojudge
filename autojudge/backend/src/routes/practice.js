// This file drives the practice feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const Practice = require('../models/Practice');
const { protect } = require('../middleware/auth');

router.get('/', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { difficulty, tag, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (difficulty) query.difficulty = difficulty;
    if (tag) query.tags = tag;
    const total = await Practice.countDocuments(query);
    const problems = await Practice.find(query).sort('-createdAt').limit(+limit).skip((+page-1)*+limit).select('-testCases');
    res.json({ success: true, problems, total, pages: Math.ceil(total/+limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const p = await Practice.findById(req.params.id);
    // Quick guard clause so we fail fast before doing heavier work.
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    p.testCases = p.testCases.filter(tc => !tc.isHidden);
    res.json({ success: true, problem: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
