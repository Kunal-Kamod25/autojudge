const Submission = require('../models/Submission');
const { runWithInput, runProjectFromZip } = require('../services/sandboxService');
const { generateFeedback } = require('../services/aiService');
const { cleanupUploadedFile } = require('../utils/fileUtils');
const fs = require('fs');
const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

exports.runCustom = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const { code, language, input = '', timeLimit, entryFile = '' } = req.body;
    const parsedLimit = Number(timeLimit);
    const customTimeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 2000), 600000)
      : 120000;
    let finalCode = code;
    let runResult = null;

    // Quick guard clause so we fail fast before doing heavier work.
    if (!language) return res.status(400).json({ success: false, message: 'Language is required' });

    // Handle file upload for custom run
    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'zip') {
        // Project mode: supports multi-file C/C++ projects and file-based input access.
        runResult = await runProjectFromZip(req.file.path, language, input, customTimeLimit, entryFile);

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

    // Quick guard clause so we fail fast before doing heavier work.
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
    // Wrap this block to return a clean API/UI error path if anything fails.
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
        gtestData: runResult.isGTest ? (runResult.gtestData || null) : null,
        language,
        input,
        timeLimit: customTimeLimit,
        testResults: submission.testResults,
        aiFeedback: submission.aiFeedback
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    cleanupUploadedFile(req.file);
  }
};

exports.extractZip = async (req, res) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    // Guard branch for invalid state or input.
    if (!req.file || !req.file.originalname.endsWith('.zip')) {
      return res.status(400).json({ success: false, message: 'ZIP file required' });
    }

    const { language } = req.body;
    // Quick guard clause so we fail fast before doing heavier work.
    if (!language) return res.status(400).json({ success: false, message: 'Language is required' });

    logger.info(`Extracting ZIP: ${req.file.originalname} for ${language}`);
    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();
    
    if (entries.length === 0) {
      logger.warn(`ZIP file is empty: ${req.file.originalname}`);
      return res.status(400).json({ success: false, message: 'ZIP file is empty' });
    }
    
    logger.info(`Found ${entries.length} raw entries in ZIP`);
    
    // Guard branch for invalid state or input.
    if (entries.length > 2000) {
      return res.status(400).json({ success: false, message: 'ZIP contains too many files' });
    }

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
      const fileName = entry.entryName;
      // Skip Mac metadata and system files
      if (entry.isDirectory || fileName.includes('__MACOSX') || fileName.includes('.DS_Store')) {
        return;
      }

      const lowerName = fileName.toLowerCase();
      const ext = fileName.split('.').pop().toLowerCase();
      const isSourceFile = allowedSourceExt.includes(ext);
      const isExpectedFile = ['out', 'ans'].includes(ext)
        || lowerName.includes('expected')
        || lowerName.includes('output')
        || lowerName.includes('answer')
        || lowerName.includes('_out')
        || lowerName.includes('_ans');
      const isInputFile = !isExpectedFile && (
        ['txt', 'in', 'input'].includes(ext)
        || lowerName.includes('input')
        || lowerName.includes('test')
        || /(?:^|[\/_-])[ksm](?:left|right|l|r)?\.txt$/i.test(lowerName)
      );

      let content = '';
      let hasMain = false;
      // Wrap this block to return a clean API/UI error path if anything fails.
      try {
        if (isSourceFile || isInputFile || isExpectedFile) {
          content = entry.header?.size > 1024 * 1024 ? '[File too large to preview]' : zip.readAsText(entry);
          if (isSourceFile) {
            if (language === 'cpp' || language === 'c') {
              hasMain = /\b(int|void)\s+main\s*\(/.test(content);
            } else if (language === 'java') {
              hasMain = /public\s+static\s+void\s+main\s*\(/.test(content);
            } else if (language === 'python') {
              const baseName = fileName.split('/').pop().toLowerCase();
              hasMain = baseName === 'main.py' || baseName === 'app.py' || /\nif\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(content);
            } else if (language === 'javascript') {
              const baseName = fileName.split('/').pop().toLowerCase();
              hasMain = baseName === 'index.js' || baseName === 'main.js' || baseName === 'app.js';
            }
          }
        }
      } catch (e) {
        content = '[Binary file or unable to read]';
      }

      files.push({
        name: fileName,
        isSourceFile,
        isInputFile,
        isExpectedFile,
        hasMain,
        size: entry.header?.size || 0,
        content
      });
    });

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    cleanupUploadedFile(req.file);
  }
};
