// This file drives the emailService feature flow and keeps the behavior easy to reason about.
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// sendOTPEmail handles one focused part of this file's workflow.
const sendOTPEmail = async (to, otp, name) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0D1B2A; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,180,216,0.2);">
      <div style="background: linear-gradient(135deg, #00B4D8, #0096B7); padding: 32px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 900;">Auto<span style="color: #0D1B2A;">Judge</span></h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Password Reset Verification</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #ccd6e0; font-size: 15px; margin: 0 0 8px;">Hi <strong style="color: #fff;">${name}</strong>,</p>
        <p style="color: #8899a6; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your password. Use the verification code below to proceed. This code expires in <strong style="color: #00B4D8;">10 minutes</strong>.
        </p>
        <div style="background: #1B2B3B; border: 1px solid rgba(0,180,216,0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #00B4D8; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        <p style="color: #8899a6; font-size: 13px; line-height: 1.5; margin: 0;">
          If you didn't request this, you can safely ignore this email. Your account is still secure.
        </p>
      </div>
      <div style="background: #1B2B3B; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #556677; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} AutoJudge. All rights reserved.</p>
      </div>
    </div>
  `;

  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    await transporter.sendMail({
      from: `"AutoJudge" <${process.env.SMTP_USER}>`,
      to,
      subject: `${otp} — Your AutoJudge Password Reset Code`,
      html,
    });
    logger.info(`OTP email sent to ${to}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send OTP email: ${err.message}`);
    throw new Error('Failed to send email. Please try again.');
  }
};

module.exports = { sendOTPEmail };
