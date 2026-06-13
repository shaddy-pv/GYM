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
        <p><strong>Login URL:</strong> <a href="https://gymos-member.vercel.app/login">https://gymos-member.vercel.app/login</a></p>
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

const memberPasswordResetEmail = ({ memberName, memberId, resetUrl }) => ({
  subject: 'Reset Your GymOS Password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Password Reset Request</h2>
      <p>Hi <strong>${memberName}</strong>,</p>
      <p>We received a request to reset your password. Here are your details:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Member ID:</strong> ${memberId}</p>
      </div>
      <p>Click the button below to set a new password:</p>
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

// ─── Owner Welcome Email (sent on registration) ────────────────────────────────
const ownerWelcomeEmail = ({ ownerName, email }) => ({
  subject: 'Welcome to GymOS — Your Account is Ready! 🎉',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to GymOS, ${ownerName}! 🎉</h2>
      <p>Your owner account has been successfully created. You can now log in and start managing your gym.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Login URL:</strong> <a href="${process.env.ADMIN_URL}">${process.env.ADMIN_URL}</a></p>
      </div>
      <p>You have a <strong>14-day free trial</strong> to explore all features. Set up your gym, add members, and track everything in one place.</p>
      <p>If you have any questions, reply to this email — we're here to help.</p>
      <p>Stay fit! 💪</p>
      <p>— The GymOS Team</p>
    </div>
  `,
});

// ─── Owner Login Alert Email (sent on every login) ────────────────────────────
const ownerLoginAlertEmail = ({ ownerName, loginTime, loginDate }) => ({
  subject: 'GymOS — New Login Detected 🔐',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Login Alert</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>A new login to your GymOS account was detected.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Date:</strong> ${loginDate}</p>
        <p><strong>Time:</strong> ${loginTime}</p>
      </div>
      <p>If this was you, no action is needed.</p>
      <p>If you did <strong>not</strong> log in, please reset your password immediately using the link below:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.ADMIN_URL}/forgot-password" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Secure My Account
        </a>
      </div>
      <p>— GymOS Security Team</p>
    </div>
  `,
});

// ─── Trainer Welcome Email (sent when owner adds a trainer) ───────────────────
const trainerWelcomeEmail = ({ trainerName, gymName, ownerName, ownerEmail, ownerPhone }) => ({
  subject: `Welcome to ${gymName} — You've Been Added as a Trainer! 🏋️`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to ${gymName}!</h2>
      <p>Hi <strong>${trainerName}</strong>,</p>
      <p>You have been added as a trainer at <strong>${gymName}</strong> on the GymOS platform.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Gym:</strong> ${gymName}</p>
        <p><strong>Added by:</strong> ${ownerName}</p>
        ${ownerEmail ? `<p><strong>Owner Email:</strong> ${ownerEmail}</p>` : ''}
        ${ownerPhone ? `<p><strong>Owner Phone:</strong> ${ownerPhone}</p>` : ''}
      </div>
      <p>Please contact your gym owner to receive your system access credentials and get started.</p>
      <p>Welcome to the team! 💪</p>
      <p>— The GymOS Team</p>
    </div>
  `,
});

module.exports = {
  sendEmail,
  memberWelcomeEmail,
  passwordResetEmail,
  memberPasswordResetEmail,
  ownerWelcomeEmail,
  ownerLoginAlertEmail,
  trainerWelcomeEmail,
};
