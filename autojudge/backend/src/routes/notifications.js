// This file drives the notifications feature flow and keeps the behavior easy to reason about.
const router = require('express').Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get all notifications for current user
router.get('/', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    const notifications = await Notification.find(query)
      .sort('-createdAt').limit(+limit).skip((+page - 1) * +limit);
    res.json({ success: true, notifications, total, unreadCount, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mark one as read
router.patch('/:id/read', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Delete one
router.delete('/:id', async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
