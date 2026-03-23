// This file drives the assignments feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');
const { generateTestCases } = require('../services/aiService');

router.use(protect);

router.get('/', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const query = req.user.role === 'teacher' ? { teacher: req.user._id } : { isPublished: true };
    const assignments = await Assignment.find(query).populate('teacher', 'name').sort('-createdAt');
    res.json({ success: true, assignments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const a = await Assignment.findById(req.params.id).populate('teacher', 'name email');
    // Quick guard clause so we fail fast before doing heavier work.
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    // Hide hidden test cases from students
    if (req.user.role === 'student') a.testCases = a.testCases.filter(tc => !tc.isHidden);
    res.json({ success: true, assignment: a });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const a = await Assignment.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, assignment: a });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/generate-tests', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const a = await Assignment.findById(req.params.id);
    // Quick guard clause so we fail fast before doing heavier work.
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    const count = req.body.count || 20;
    const testCases = await generateTestCases(a.problemStatement, req.body.language || 'python', count);
    const formatted = testCases.map(tc => ({ ...tc, isHidden: tc.type === 'hidden' }));
    a.testCases.push(...formatted);
    a.aiGenerated = true;
    await a.save();
    res.json({ success: true, testCases: formatted, message: `Generated ${formatted.length} test cases` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const a = await Assignment.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id }, req.body, { new: true });
    // Quick guard clause so we fail fast before doing heavier work.
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, assignment: a });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    await Assignment.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
