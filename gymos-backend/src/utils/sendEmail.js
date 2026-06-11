const { getTransporter } = require('../config/nodemailer');
const logger = require('../config/logger');

/**
 * Send an email
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text = '' }) => {
  try {
    const transporter = getTransporter();
    if (!transporter || !process.env.SMTP_USER) {
      logger.warn('Email not configured — skipping send');
      return { success: false, reason: 'not_configured' };
    }

    const info = await transporter.sendMail({
      from: `"GymOS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    return { success: false, reason: error.message };
  }
};

// ─── Email Templates ───────────────────────────────────────────────────────

const memberWelcomeEmail = ({ memberName, gymName, memberId, password, expiryDate }) => ({
  subject: `Welcome to ${gymName}! 🎉`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to ${gymName}!</h2>
      <p>Hi <strong>${memberName}</strong>,</p>
      <p>Your gym membership has been activated. Here are your login credentials:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Member ID:</strong> ${memberId}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p><strong>Login URL:</strong> <a href="${process.env.MEMBER_URL}">${process.env.MEMBER_URL}</a></p>
      </div>
      <p><strong>Membership valid till:</strong> ${new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p>Please change your password after first login.</p>
      <p>Stay fit! 💪</p>
      <p>— The ${gymName} Team</p>
    </div>
  `,
});

const passwordResetEmail = ({ ownerName, resetUrl }) => ({
  subject: 'Reset Your GymOS Password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Password Reset Request</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>This link expires in <strong>15 minutes</strong>.</p>
      <p>If you didn't request this, ignore this email.</p>
      <p>— GymOS Team</p>
    </div>
  `,
});

module.exports = { sendEmail, memberWelcomeEmail, passwordResetEmail };
