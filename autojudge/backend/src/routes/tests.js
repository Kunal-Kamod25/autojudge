// This file drives the tests feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { generateTestCases } = require('../services/aiService');

router.post('/generate', protect, authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { problemStatement, language, count } = req.body;
    const testCases = await generateTestCases(problemStatement, language, count || 20);
    res.json({ success: true, testCases });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
