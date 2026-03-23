// This file drives the upload feature flow and keeps the behavior easy to reason about.
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

// fileFilter handles one focused part of this file's workflow.
const fileFilter = (req, file, cb) => {
  const allowed = ['.cpp', '.c', '.py', '.java', '.js', '.zip', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = new Set([
    'text/plain',
    'text/x-c',
    'text/x-c++src',
    'text/x-java-source',
    'application/javascript',
    'text/javascript',
    'application/zip',
    'application/x-zip-compressed'
  ]);

  // Quick guard clause so we fail fast before doing heavier work.
  if (!allowed.includes(ext)) return cb(new Error('Invalid file type'), false);

  // Guard branch for invalid state or input.
  if (ext === '.zip' || !file.mimetype || allowedMimes.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Invalid file MIME type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

module.exports = upload;
