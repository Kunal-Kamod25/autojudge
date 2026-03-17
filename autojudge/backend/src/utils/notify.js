const Notification = require('../models/Notification');

const notify = async (io, userId, { type, title, message, link, meta = {} }) => {
  try {
    const n = await Notification.create({ user: userId, type, title, message, link, meta });
    io?.to(userId.toString()).emit('notification', n);
    return n;
  } catch (e) { console.error('Notify error:', e.message); }
};

module.exports = notify;
