const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testCaseId: mongoose.Schema.Types.ObjectId,
  type: String,
  input: String,
  expectedOutput: String,
  actualOutput: String,
  verdict: { type: String, enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'], default: 'PENDING' },
  executionTime: Number,
  memoryUsed: Number,
  points: { type: Number, default: 0 },
  errorMessage: String
});

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  practice: { type: mongoose.Schema.Types.ObjectId, ref: 'Practice' },
  code: { type: String, required: true },
  language: { type: String, enum: ['cpp', 'python', 'java', 'javascript', 'c'], required: true },
  fileName: String,
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  verdict: { type: String, enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'], default: 'PENDING' },
  score: { type: Number, default: 0 },
  totalScore: { type: Number, default: 100 },
  testResults: [testResultSchema],
  passedTests: { type: Number, default: 0 },
  totalTests: { type: Number, default: 0 },
  executionTime: Number,
  memoryUsed: Number,
  aiFeedback: {
    summary: String,
    bugs: [String],
    improvements: [String],
    complexity: String,
    style: String,
    modelUsed: String
  },
  plagiarismScore: { type: Number, default: 0 },
  plagiarismDetails: String,
  pdfReportPath: String
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
