const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  validate
], ctrl.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate
], ctrl.login);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);

// Forgot Password (OTP via email)
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required'),
  validate
], ctrl.forgotPassword);

router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate
], ctrl.verifyOTP);

router.post('/reset-password', [
  body('resetToken').notEmpty().withMessage('Reset token required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  validate
], ctrl.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/auth/login?error=oauth_failed` }), ctrl.oauthSuccess);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: `${frontendUrl}/auth/login?error=oauth_failed` }), ctrl.oauthSuccess);

module.exports = router;
