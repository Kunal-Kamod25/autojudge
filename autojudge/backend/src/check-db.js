// This file drives the check-db feature flow and keeps the behavior easy to reason about.
const mongoose = require('mongoose');
require('dotenv').config();

// checkDB handles one focused part of this file's workflow.
const checkDB = async () => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autojudge';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }), 'assignments');
    
    const userCount = await User.countDocuments();
    const assignmentCount = await Assignment.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`Assignments: ${assignmentCount}`);
    
    if (userCount === 0) {
      console.log('No users found. You might want to register an admin user.');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
};

checkDB();
