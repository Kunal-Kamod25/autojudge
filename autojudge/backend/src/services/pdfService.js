const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const COLORS = {
  primary: '#00B4D8',
  dark: '#0D1B2A',
  success: '#00C896',
  error: '#FF5A5F',
  warning: '#FF9E00',
  gray: '#90A4AE',
  white: '#FFFFFF',
  light: '#E8F4FD'
};

exports.generateSubmissionReport = async (submission, user, assignment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const reportsDir = path.join('./uploads', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const filename = `report_${submission._id}_${Date.now()}.pdf`;
    const filepath = path.join(reportsDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.rect(0, 0, 595, 80).fill('#0D1B2A');
    doc.fillColor('#00B4D8').fontSize(28).font('Helvetica-Bold').text('AutoJudge', 50, 20);
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica').text('Code Assessment Report', 50, 52);
    doc.fillColor('#90A4AE').fontSize(10).text(new Date().toLocaleString(), 400, 52);

    // Student Info Box
    doc.rect(50, 100, 495, 70).fillAndStroke('#E8F4FD', '#00B4D8');
    doc.fillColor('#0D1B2A').fontSize(11).font('Helvetica-Bold').text('Student:', 70, 115);
    doc.font('Helvetica').text(user.name || 'N/A', 140, 115);
    doc.font('Helvetica-Bold').text('Email:', 70, 135);
    doc.font('Helvetica').text(user.email || 'N/A', 140, 135);
    doc.font('Helvetica-Bold').text('Assignment:', 300, 115);
    doc.font('Helvetica').text(assignment?.title || 'Practice', 400, 115);
    doc.font('Helvetica-Bold').text('Language:', 300, 135);
    doc.font('Helvetica').text(submission.language?.toUpperCase() || 'N/A', 400, 135);

    // Score Section
    doc.moveDown(4);
    const scoreColor = submission.score >= 80 ? '#00C896' : submission.score >= 50 ? '#FF9E00' : '#FF5A5F';
    doc.rect(50, 185, 495, 60).fillAndStroke(scoreColor, scoreColor);
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
      .text(`Score: ${submission.score || 0} / ${submission.totalScore || 100}`, 70, 200);
    doc.fontSize(14).text(`Verdict: ${submission.verdict || 'N/A'}  |  Tests: ${submission.passedTests || 0}/${submission.totalTests || 0} passed`, 70, 228);

    // Test Results Table
    let y = 265;
    doc.fillColor('#0D1B2A').fontSize(14).font('Helvetica-Bold').text('Test Case Results', 50, y);
    y += 25;
    doc.rect(50, y, 495, 25).fill('#0D1B2A');
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('#', 60, y + 7); doc.text('Type', 90, y + 7);
    doc.text('Verdict', 200, y + 7); doc.text('Time (ms)', 290, y + 7);
    doc.text('Input (preview)', 380, y + 7);
    y += 25;

    const results = (submission.testResults || []).slice(0, 25);
    results.forEach((r, i) => {
      if (y > 720) { doc.addPage(); y = 50; }
      const bg = i % 2 === 0 ? '#F8FBFF' : '#FFFFFF';
      doc.rect(50, y, 495, 22).fill(bg);
      const vColor = r.verdict === 'AC' ? '#00C896' : r.verdict === 'TLE' ? '#FF9E00' : '#FF5A5F';
      doc.fillColor('#333').fontSize(9).font('Helvetica').text(`${i+1}`, 60, y+6);
      doc.text(r.type || 'basic', 90, y+6);
      doc.fillColor(vColor).font('Helvetica-Bold').text(r.verdict || '-', 200, y+6);
      doc.fillColor('#333').font('Helvetica').text(`${r.executionTime || 0}ms`, 290, y+6);
      doc.text((r.input || '').substring(0, 25) + (r.input?.length > 25 ? '...' : ''), 380, y+6);
      y += 22;
    });

    // AI Feedback
    if (submission.aiFeedback?.summary) {
      if (y > 650) { doc.addPage(); y = 50; }
      y += 20;
      doc.rect(50, y, 495, 20).fill('#0D1B2A');
      doc.fillColor('#00B4D8').fontSize(13).font('Helvetica-Bold').text('AI Feedback', 60, y+3);
      y += 28;
      doc.fillColor('#0D1B2A').fontSize(11).font('Helvetica-Bold').text('Summary:', 50, y);
      y += 18;
      doc.font('Helvetica').fontSize(10).fillColor('#333')
        .text(submission.aiFeedback.summary, 50, y, { width: 495 });
      y = doc.y + 12;

      if (submission.aiFeedback.bugs?.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#FF5A5F').text('Bugs Found:', 50, y);
        y += 18;
        submission.aiFeedback.bugs.forEach(bug => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc.fontSize(9).font('Helvetica').fillColor('#333').text(`• ${bug}`, 60, y, { width: 480 });
          y = doc.y + 6;
        });
      }

      if (submission.aiFeedback.improvements?.length > 0) {
        y += 5;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#00C896').text('Improvements:', 50, y);
        y += 18;
        submission.aiFeedback.improvements.forEach(imp => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc.fontSize(9).font('Helvetica').fillColor('#333').text(`• ${imp}`, 60, y, { width: 480 });
          y = doc.y + 6;
        });
      }

      if (submission.aiFeedback.complexity) {
        y += 5;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0D1B2A').text('Complexity:', 50, y);
        y += 18;
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(submission.aiFeedback.complexity, 60, y, { width: 480 });
        y = doc.y + 8;
      }
    }

    // Code Listing (first 50 lines)
    if (submission.code) {
      if (y > 600) { doc.addPage(); y = 50; }
      y += 15;
      doc.rect(50, y, 495, 20).fill('#0D1B2A');
      doc.fillColor('#00B4D8').fontSize(13).font('Helvetica-Bold').text('Submitted Code', 60, y+3);
      y += 25;
      const codeLines = submission.code.split('\n').slice(0, 50);
      doc.font('Courier').fontSize(8).fillColor('#1a1a2e');
      doc.rect(50, y, 495, Math.min(codeLines.length * 12 + 10, 350)).fill('#f5f5f5');
      codeLines.forEach((line, idx) => {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.fillColor('#888').text(`${idx+1}`.padStart(3), 55, y + 5);
        doc.fillColor('#1a1a2e').text(line.substring(0, 90), 80, y + 5);
        y += 12;
      });
    }

    // Footer
    doc.rect(0, 800, 595, 42).fill('#0D1B2A');
    doc.fillColor('#90A4AE').fontSize(9).font('Helvetica')
      .text(`AutoJudge | Generated: ${new Date().toISOString()} | AI Model: ${submission.aiFeedback?.modelUsed || 'N/A'}`, 50, 815, { align: 'center', width: 495 });

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
};
