const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { generateTestCases } = require('../services/aiService');

router.post('/generate', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { problemStatement, language, count } = req.body;
    const testCases = await generateTestCases(problemStatement, language, count || 20);
    res.json({ success: true, testCases });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
