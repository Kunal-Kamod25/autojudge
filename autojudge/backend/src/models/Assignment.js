// This file drives the Assignment feature flow and keeps the behavior easy to reason about.
const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  type: { type: String, enum: ['basic', 'edge', 'stress', 'boundary', 'random', 'hidden'], default: 'basic' },
  timeLimit: { type: Number, default: 2000 },
  memoryLimit: { type: Number, default: 256 },
  points: { type: Number, default: 1 },
  isHidden: { type: Boolean, default: false }
});

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  problemStatement: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: String, default: '' },
  languages: [{ type: String, enum: ['cpp', 'python', 'java', 'javascript', 'c'] }],
  testCases: [testCaseSchema],
  totalPoints: { type: Number, default: 100 },
  dueDate: Date,
  isPublished: { type: Boolean, default: false },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: [String],
  allowFileUpload: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 10 },
  aiGenerated: { type: Boolean, default: false },
  sampleInput: String,
  sampleOutput: String,
  constraints: String
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
