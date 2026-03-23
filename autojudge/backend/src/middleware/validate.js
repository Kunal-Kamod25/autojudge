// This file drives the validate feature flow and keeps the behavior easy to reason about.
const { validationResult } = require('express-validator');
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  // Quick guard clause so we fail fast before doing heavier work.
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
