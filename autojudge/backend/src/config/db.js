// This file drives the db feature flow and keeps the behavior easy to reason about.
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// connectDB handles one focused part of this file's workflow.
const connectDB = async () => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autojudge');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
