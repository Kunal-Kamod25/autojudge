// This file drives the notify feature flow and keeps the behavior easy to reason about.
const Notification = require('../models/Notification');

// notify handles one focused part of this file's workflow.
const notify = async (io, userId, { type, title, message, link, meta = {} }) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const n = await Notification.create({ user: userId, type, title, message, link, meta });
    io?.to(userId.toString()).emit('notification', n);
    return n;
  } catch (e) { console.error('Notify error:', e.message); }
};

module.exports = notify;
