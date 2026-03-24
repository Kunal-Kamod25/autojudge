// This file drives the seed feature flow and keeps the behavior easy to reason about.
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const User = require('./models/User');
const Assignment = require('./models/Assignment');

// seedData handles one focused part of this file's workflow.
const seedData = async () => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autojudge';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data (optional, but good for a clean start)
    await User.deleteMany({});
    await Assignment.deleteMany({});
    console.log('Cleared existing data.');

    const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
    const teacherPassword = process.env.SEED_TEACHER_PASSWORD || crypto.randomBytes(18).toString('base64url');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@autojudge.com',
      password: adminPassword,
      role: 'admin',
      isVerified: true
    });
    console.log(`Admin user created: admin@autojudge.com / ${adminPassword}`);

    // Create Teacher User
    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher@autojudge.com',
      password: teacherPassword,
      role: 'teacher',
      isVerified: true
    });
    console.log(`Teacher user created: teacher@autojudge.com / ${teacherPassword}`);

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
