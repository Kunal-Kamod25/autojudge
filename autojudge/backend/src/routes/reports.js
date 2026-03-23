// This file drives the reports feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const Submission = require('../models/Submission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/teacher/dashboard', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const Assignment = require('../models/Assignment');
    const myAssignments = await Assignment.find({ teacher: req.user._id }).select('_id');
    const ids = myAssignments.map(a => a._id);
    const totalSubs = await Submission.countDocuments({ assignment: { $in: ids } });
    const plagiarism = await Submission.countDocuments({ assignment: { $in: ids }, plagiarismScore: { $gte: 70 } });
    const verdictStats = await Submission.aggregate([
      { $match: { assignment: { $in: ids } } },
      { $group: { _id: '$verdict', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, stats: { totalSubmissions: totalSubs, plagiarismAlerts: plagiarism, verdicts: verdictStats, totalAssignments: ids.length } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/student/dashboard', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const subs = await Submission.find({ student: req.user._id }).sort('-createdAt').limit(10).populate('assignment', 'title');
    const stats = await Submission.aggregate([
      { $match: { student: req.user._id } },
      { $group: { _id: '$verdict', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, recentSubmissions: subs, verdictStats: stats, userStats: req.user.stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});



// Plagiarism report for teacher
router.get('/plagiarism', authorize('teacher', 'admin'), async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { assignmentId } = req.query;
    const Assignment = require('../models/Assignment');
    let assignmentIds;
    if (assignmentId) {
      assignmentIds = [assignmentId];
    } else {
      const myAssignments = await Assignment.find({ teacher: req.user._id }).select('_id');
      assignmentIds = myAssignments.map(a => a._id);
    }
    const subs = await Submission.find({ assignment: { $in: assignmentIds }, plagiarismScore: { $gte: 70 } })
      .populate('student', 'name email avatar')
      .populate('assignment', 'title')
      .sort('-plagiarismScore')
      .limit(50);
    res.json({ success: true, submissions: subs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
