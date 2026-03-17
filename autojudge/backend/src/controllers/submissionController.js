const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { runCode } = require('../services/sandboxService');
const { generateFeedback, detectPlagiarism } = require('../services/aiService');
const { generateSubmissionReport } = require('../services/pdfService');
const fs = require('fs');
const AdmZip = require('adm-zip');

exports.submit = async (req, res) => {
  try {
    const { code, language, assignmentId } = req.body;
    let finalCode = code;

    // Handle file upload
    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'zip') {
        const zip = new AdmZip(req.file.path);
        const entries = zip.getEntries().filter(e => !e.isDirectory);
        const codeEntry = entries.find(e => ['cpp','c','py','java','js'].includes(e.entryName.split('.').pop()));
        if (codeEntry) finalCode = zip.readAsText(codeEntry);
        else return res.status(400).json({ success: false, message: 'No valid code file in zip' });
      } else {
        finalCode = fs.readFileSync(req.file.path, 'utf-8');
      }
    }

    if (!finalCode) return res.status(400).json({ success: false, message: 'No code provided' });

    let testCases = [], assignment = null, totalScore = 100;

    if (assignmentId) {
      assignment = await Assignment.findById(assignmentId);
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
      if (!assignment.languages.includes(language)) return res.status(400).json({ success: false, message: 'Language not allowed' });
      testCases = assignment.testCases;
      totalScore = assignment.totalPoints;
    }

    // Create submission
    const submission = await Submission.create({
      student: req.user._id,
      assignment: assignmentId || undefined,
      code: finalCode,
      language,
      fileName: req.file?.originalname,
      status: 'running',
      totalScore,
      totalTests: testCases.length
    });

    // Emit start event
    const io = req.app.get('io');
    io?.to(req.user._id.toString()).emit('submission-start', { submissionId: submission._id });

    // Run tests
    const testResults = testCases.length > 0 ? await runCode(finalCode, language, testCases) : [];
    const passed = testResults.filter(r => r.verdict === 'AC').length;
    const score = testCases.length > 0 ? Math.round((passed / testCases.length) * totalScore) : 0;
    const overallVerdict = testResults.length === 0 ? 'AC' :
      testResults.some(r => r.verdict === 'CE') ? 'CE' :
      testResults.every(r => r.verdict === 'AC') ? 'AC' : 'WA';

    // AI Feedback (async - don't block response)
    let aiFeedback = { summary: 'Processing...', bugs: [], improvements: [], modelUsed: 'pending' };
    generateFeedback(finalCode, language, testResults, assignment?.title || 'Practice').then(async (feedback) => {
      submission.aiFeedback = feedback;

      // Plagiarism check against recent submissions
      if (assignmentId) {
        const others = await Submission.find({ assignment: assignmentId, _id: { $ne: submission._id }, student: { $ne: req.user._id } }).limit(10).select('code');
        for (const other of others) {
          const result = await detectPlagiarism(finalCode, other.code, language);
          if (result.flagged) { submission.plagiarismScore = result.similarity; submission.plagiarismDetails = result.details; break; }
        }
      }

      // Generate PDF
      const pdfPath = await generateSubmissionReport(submission, req.user, assignment);
      submission.pdfReportPath = pdfPath;
      await submission.save();

      // Update user stats
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalSubmissions': 1, 'stats.solved': overallVerdict === 'AC' ? 1 : 0 } });

      io?.to(req.user._id.toString()).emit('submission-complete', {
        submissionId: submission._id, verdict: overallVerdict, score, passed, total: testCases.length, feedback
      });
    }).catch(err => console.error('AI feedback error:', err));

    // Update submission with results
    submission.testResults = testResults;
    submission.passedTests = passed;
    submission.score = score;
    submission.verdict = overallVerdict;
    submission.status = 'completed';
    submission.executionTime = testResults.reduce((max, r) => Math.max(max, r.executionTime || 0), 0);
    await submission.save();

    res.json({ success: true, submission: { _id: submission._id, verdict: overallVerdict, score, totalScore, passed, total: testCases.length, testResults, status: 'completed' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubmission = async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id).populate('student', 'name email avatar').populate('assignment', 'title');
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    if (sub.student._id.toString() !== req.user._id.toString() && req.user.role === 'student') return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, submission: sub });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.downloadPDF = async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id).populate('student', 'name email').populate('assignment', 'title');
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    if (sub.student._id.toString() !== req.user._id.toString() && req.user.role === 'student') return res.status(403).json({ success: false, message: 'Access denied' });

    let pdfPath = sub.pdfReportPath;
    if (!pdfPath || !require('fs').existsSync(pdfPath)) {
      const { generateSubmissionReport } = require('../services/pdfService');
      pdfPath = await generateSubmissionReport(sub, sub.student, sub.assignment);
      sub.pdfReportPath = pdfPath; await sub.save();
    }
    res.download(pdfPath, `report_${sub._id}.pdf`);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, assignmentId } = req.query;
    const query = { student: req.user._id };
    if (assignmentId) query.assignment = assignmentId;
    const total = await Submission.countDocuments(query);
    const subs = await Submission.find(query).populate('assignment', 'title').sort('-createdAt').limit(+limit).skip((+page-1)*+limit).select('-code -testResults');
    res.json({ success: true, submissions: subs, total, pages: Math.ceil(total/+limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
