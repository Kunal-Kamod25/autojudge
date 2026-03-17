const mongoose = require('mongoose');
require('dotenv').config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autojudge');
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
