const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Assignment = require('./models/Assignment');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autojudge');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data (optional, but good for a clean start)
    await User.deleteMany({});
    await Assignment.deleteMany({});
    console.log('Cleared existing data.');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@autojudge.com',
      password: 'adminpassword123', // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true
    });
    console.log('Admin user created: admin@autojudge.com / adminpassword123');

    // Create Teacher User
    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher@autojudge.com',
      password: 'teacherpassword123',
      role: 'teacher',
      isVerified: true
    });
    console.log('Teacher user created: teacher@autojudge.com / teacherpassword123');

    // Create Sample Assignment
    const assignment = await Assignment.create({
      title: 'Hello World in Python',
      description: 'Write a program that prints "Hello, World!" to the console.',
      problemStatement: 'The task is simple: output the string "Hello, World!" exactly as shown.',
      teacher: teacher._id,
      course: 'CS101',
      languages: ['python'],
      testCases: [
        {
          input: ' ',
          expectedOutput: 'Hello, World!\n',
          type: 'basic',
          points: 10
        },
        {
          input: ' ',
          expectedOutput: 'Hello, World!\n',
          type: 'hidden',
          points: 90,
          isHidden: true
        }
      ],
      totalPoints: 100,
      isPublished: true,
      difficulty: 'easy',
      tags: ['intro', 'python'],
      sampleOutput: 'Hello, World!'
    });
    console.log('Sample assignment created: Hello World in Python');

    console.log('Seeding completed successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
};

seedData();
