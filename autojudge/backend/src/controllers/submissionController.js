const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { runCode, runWithInput, runProjectFromZip, runProjectAgainstTests } = require('../services/sandboxService');
const { generateFeedback, detectPlagiarism } = require('../services/aiService');
const { generateSubmissionReport } = require('../services/pdfService');
const fs = require('fs');
const AdmZip = require('adm-zip');

exports.submit = async (req, res) => {
  try {
    const { code, language, assignmentId } = req.body;
    let finalCode = code;
    let isZipUpload = false;

    // Handle file upload
    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'zip') {
        isZipUpload = true;
        const zip = new AdmZip(req.file.path);
        const entries = zip.getEntries().filter(e => !e.isDirectory);
        const sourceExtByLang = {
          cpp: ['cpp', 'cc', 'cxx', 'hpp', 'h'],
          c: ['c', 'h'],
          python: ['py'],
          java: ['java'],
          javascript: ['js']
        };
        const allowedExt = sourceExtByLang[language] || ['cpp', 'c', 'py', 'java', 'js'];
        const codeEntries = entries.filter(e => allowedExt.includes((e.entryName.split('.').pop() || '').toLowerCase()));
        if (codeEntries.length > 0) {
          finalCode = codeEntries.slice(0, 15).map((e) => `// FILE: ${e.entryName}\n${zip.readAsText(e)}`).join('\n\n');
        } else {
          return res.status(400).json({ success: false, message: 'No valid code files in zip' });
        }
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

    // Run tests (supports normal source files and zip project mode)
    let isGTest = false;
    let testResults = [];

    if (testCases.length > 0 || (isZipUpload && assignmentId)) {
      if (isZipUpload) {
        const projectRun = await runProjectAgainstTests(req.file.path, language, testCases);
        testResults = projectRun.testResults;
        isGTest = !!projectRun.isGTest;
      } else {
        testResults = await runCode(finalCode, language, testCases);
      }
    }

    const passed = testResults.filter(r => r.verdict === 'AC').length;
    const totalEvaluated = isGTest ? testResults.length : (testCases.length || testResults.length);
    const overallVerdict = testResults.length === 0 ? 'AC' :
      testResults.some(r => r.verdict === 'CE') ? 'CE' :
      testResults.some(r => r.verdict === 'RE') ? 'RE' :
      testResults.some(r => r.verdict === 'TLE') ? 'TLE' :
      testResults.every(r => r.verdict === 'AC') ? 'AC' : 'WA';
    const score = testResults.length > 0
      ? (isGTest ? (overallVerdict === 'AC' ? totalScore : 0) : Math.round((passed / Math.max(totalEvaluated, 1)) * totalScore))
      : 0;

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
        submissionId: submission._id, verdict: overallVerdict, score, passed, total: totalEvaluated, isGTest, feedback
      });
    }).catch(err => console.error('AI feedback error:', err));

    // Update submission with results
    submission.testResults = testResults;
    submission.passedTests = passed;
    submission.totalTests = totalEvaluated;
    submission.score = score;
    submission.verdict = overallVerdict;
    submission.status = 'completed';
    submission.executionTime = testResults.reduce((max, r) => Math.max(max, r.executionTime || 0), 0);
    await submission.save();

    res.json({ success: true, submission: { _id: submission._id, verdict: overallVerdict, score, totalScore, passed, total: totalEvaluated, isGTest, testResults, status: 'completed' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runCustom = async (req, res) => {
  try {
    const { code, language, input = '', timeLimit } = req.body;
    const parsedLimit = Number(timeLimit);
    const customTimeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 2000), 600000)
      : 120000;
    let finalCode = code;
    let runResult = null;

    if (!language) return res.status(400).json({ success: false, message: 'Language is required' });

    // Handle file upload for custom run
    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'zip') {
        // Project mode: supports multi-file C/C++ projects and file-based input access.
        runResult = await runProjectFromZip(req.file.path, language, input, customTimeLimit);

        // Keep one representative source in DB for quick preview/history.
        const zip = new AdmZip(req.file.path);
        const entries = zip.getEntries().filter(e => !e.isDirectory);
        const sourceExtByLang = {
          cpp: ['cpp', 'cc', 'cxx'],
          c: ['c'],
          python: ['py'],
          java: ['java'],
          javascript: ['js']
        };
        const allowedExt = sourceExtByLang[language] || [];
        const codeEntry = entries.find(e => allowedExt.includes((e.entryName.split('.').pop() || '').toLowerCase()));
        if (codeEntry) finalCode = zip.readAsText(codeEntry);
        else return res.status(400).json({ success: false, message: 'No valid code file in zip' });
      } else {
        finalCode = fs.readFileSync(req.file.path, 'utf-8');
      }
    }

    if (!finalCode) return res.status(400).json({ success: false, message: 'No code provided' });
    if (!runResult) runResult = await runWithInput(finalCode, language, input, customTimeLimit);

    const submission = await Submission.create({
      student: req.user._id,
      code: finalCode,
      language,
      fileName: req.file?.originalname,
      status: 'completed',
      verdict: runResult.verdict,
      score: 0,
      totalScore: 0,
      totalTests: 1,
      passedTests: runResult.verdict === 'AC' ? 1 : 0,
      executionTime: runResult.executionTime,
      testResults: [{
        type: 'custom',
        input,
        expectedOutput: '',
        actualOutput: runResult.output,
        verdict: runResult.verdict,
        executionTime: runResult.executionTime,
        memoryUsed: 0,
        points: 0,
        errorMessage: runResult.errorMessage || ''
      }]
    });

    // Lightweight AI feedback for custom run
    try {
      const feedback = await generateFeedback(finalCode, language, submission.testResults, 'Custom Run');
      submission.aiFeedback = feedback;
      await submission.save();
    } catch (e) {
      // Keep custom run fast even if AI feedback fails
    }

    res.json({
      success: true,
      submission: {
        _id: submission._id,
        verdict: runResult.verdict,
        output: runResult.output,
        errorMessage: runResult.errorMessage,
        executionTime: runResult.executionTime,
        isGTest: !!runResult.isGTest,
        language,
        input,
        timeLimit: customTimeLimit,
        testResults: submission.testResults,
        aiFeedback: submission.aiFeedback
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.extractZip = async (req, res) => {
  try {
    if (!req.file || !req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ success: false, message: 'ZIP file required' });
    }

    const { language } = req.body;
    if (!language) return res.status(400).json({ success: false, message: 'Language is required' });

    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();

    const files = [];
    const sourceExtByLang = {
      cpp: ['cpp', 'cc', 'cxx', 'hpp', 'h'],
      c: ['c', 'h'],
      python: ['py'],
      java: ['java'],
      javascript: ['js']
    };
    const allowedSourceExt = sourceExtByLang[language] || ['cpp', 'c', 'py', 'java', 'js'];

    entries.forEach(entry => {
      if (!entry.isDirectory) {
        const fileName = entry.entryName;
        const ext = fileName.split('.').pop().toLowerCase();
        const isSourceFile = allowedSourceExt.includes(ext);
        const isInputFile = ['txt', 'in', 'input'].includes(ext) || fileName.includes('input') || fileName.includes('test');

        let content = '';
        try {
          if (isSourceFile || isInputFile) {
            content = zip.readAsText(entry);
          }
        } catch (e) {
          content = '[Binary file or unable to read]';
        }

        files.push({
          name: fileName,
          isSourceFile,
          isInputFile,
          size: entry.header.size,
          content
        });
      }
    });

    res.json({ success: true, files });
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
