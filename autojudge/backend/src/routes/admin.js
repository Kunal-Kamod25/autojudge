const router = require('express').Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Practice = require('../models/Practice');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [users, submissions, assignments, practices] = await Promise.all([
      User.countDocuments(),
      Submission.countDocuments(),
      Assignment.countDocuments(),
      Practice.countDocuments()
    ]);
    const usersByRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const recentSubs = await Submission.find().sort('-createdAt').limit(10).populate('student', 'name').populate('assignment', 'title');
    const subsByLang = await Submission.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }]);
    res.json({ success: true, stats: { users, submissions, assignments, practices, usersByRole, subsByLang }, recentSubmissions: recentSubs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort('-createdAt').limit(+limit).skip((+page-1)*+limit).select('-refreshTokens -password');
    res.json({ success: true, users, total, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/practice', async (req, res) => {
  try {
    const p = await Practice.create(req.body);
    res.status(201).json({ success: true, problem: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/practice/:id', async (req, res) => {
  try {
    await Practice.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
