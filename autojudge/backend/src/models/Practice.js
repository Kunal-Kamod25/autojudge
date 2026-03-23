// This file drives the Practice feature flow and keeps the behavior easy to reason about.
const mongoose = require('mongoose');

const practiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  category: { type: String, default: 'General' },
  tags: [String],
  languages: [String],
  testCases: [{
    input: String,
    expectedOutput: String,
    type: String,
    isHidden: { type: Boolean, default: false }
  }],
  sampleInput: String,
  sampleOutput: String,
  constraints: String,
  problemStatement: String,
  totalSolved: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Practice', practiceSchema);
