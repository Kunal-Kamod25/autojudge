const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const accountCtrl = require('../controllers/accountController');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  validate
], authCtrl.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate
], authCtrl.login);

router.post('/refresh', authCtrl.refreshToken);
router.post('/logout', protect, authCtrl.logout);
router.get('/me', protect, accountCtrl.getMe);

// Forgot Password (OTP via email)
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required'),
  validate
], accountCtrl.forgotPassword);

router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate
], accountCtrl.verifyOTP);

router.post('/reset-password', [
  body('resetToken').notEmpty().withMessage('Reset token required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  validate
], accountCtrl.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/auth/login?error=oauth_failed` }), authCtrl.oauthSuccess);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: `${frontendUrl}/auth/login?error=oauth_failed` }), authCtrl.oauthSuccess);

module.exports = router;
