const { getTwilioClient } = require('../config/twilio');
const logger = require('../config/logger');

/**
 * Send a WhatsApp message via Twilio
 * Never throws — failures are logged and swallowed.
 *
 * @param {string} to - E.164 phone number (e.g., "+919876543210")
 * @param {string} message - Message body
 * @returns {Promise<{success: boolean, sid?: string, reason?: string}>}
 */
const sendWhatsApp = async (to, message) => {
  try {
    const client = getTwilioClient();
    if (!client) {
      logger.warn('WhatsApp not configured — skipping send');
      return { success: false, reason: 'not_configured' };
    }

    // Normalize number to WhatsApp format
    const toNumber = `whatsapp:${to.startsWith('+') ? to : '+91' + to}`;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    const result = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message,
    });

    logger.info(`WhatsApp sent to ${toNumber}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    logger.error(`WhatsApp send failed to ${to}: ${error.message}`);
    return { success: false, reason: error.message };
  }
};

// ─── WhatsApp Message Templates ────────────────────────────────────────────

const welcomeMessage = ({ gymName, memberId, password, planName, expiryDate }) =>
  `🏋️ *Welcome to ${gymName}!*\n\n` +
  `Your membership is now active.\n\n` +
  `*Member ID:* ${memberId}\n` +
  `*Password:* ${password}\n` +
  `*Login URL:* https://gymos-member.vercel.app/login\n\n` +
  `*Plan:* ${planName}\n` +
  `*Valid till:* ${new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
  `Stay consistent! 💪`;

const paymentReceiptMessage = ({ gymName, receiptNumber, amount, planName, expiryDate }) =>
  `✅ *Payment Received!*\n\n` +
  `*${gymName}*\n` +
  `Receipt: ${receiptNumber}\n` +
  `Amount: ₹${amount}\n` +
  `Plan: ${planName}\n` +
  `Valid till: ${new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
  `Thank you! 🙏`;



const streakLostMessage = ({ memberName, streak }) =>
  `😢 *Streak Lost!*\n\n` +
  `Hi ${memberName}!\n` +
  `Your ${streak}-day workout streak was reset.\n` +
  `Don't give up — start a new streak today! 🔥\n` +
  `We believe in you! 💪`;

const attendanceReminderMessage = ({ memberName, gymName }) =>
  `Hey ${memberName}! 👋\n\n` +
  `We noticed you missed your usual workout time at ${gymName} today.\n` +
  `Consistency is key—don't break your streak! Get your workout in today! 💪`;

// ─── Owner Welcome WhatsApp (sent on registration) ────────────────────────────
const ownerWelcomeWhatsApp = ({ ownerName, email }) =>
  `🎉 *Welcome to GymOS!*\n\n` +
  `Hi ${ownerName}! Your owner account is ready.\n\n` +
  `*Login Email:* ${email}\n` +
  `*Login URL:* ${process.env.ADMIN_URL || 'admin.gymOS.com'}\n\n` +
  `You have a *14-day free trial* — set up your gym and start adding members today! 💪\n` +
  `— GymOS Team`;

// ─── Owner Login Alert WhatsApp (sent on every login) ────────────────────────
const ownerLoginAlertWhatsApp = ({ ownerName, loginTime, loginDate }) =>
  `🔐 *GymOS Login Alert*\n\n` +
  `Hi ${ownerName}, a new login to your GymOS account was detected.\n\n` +
  `*Date:* ${loginDate}\n` +
  `*Time:* ${loginTime}\n\n` +
  `If this was you, no action needed.\n` +
  `If NOT you, secure your account immediately:\n` +
  `${process.env.ADMIN_URL || 'admin.gymOS.com'}/forgot-password`;

// ─── Trainer Welcome WhatsApp (sent when owner adds a trainer) ────────────────
const trainerWelcomeWhatsApp = ({ trainerName, gymName, ownerName, ownerPhone }) =>
  `🏋️ *Welcome to ${gymName}!*\n\n` +
  `Hi ${trainerName}! You've been added as a trainer.\n\n` +
  `*Gym:* ${gymName}\n` +
  `*Added by:* ${ownerName}\n` +
  (ownerPhone ? `*Owner Contact:* ${ownerPhone}\n` : '') +
  `\nPlease contact your gym owner for system access credentials.\n` +
  `*Trainer Portal:* ${process.env.TRAINER_URL || 'trainer.gymOS.com'}\n\n` +
  `Welcome to the team! 💪`;

module.exports = {
  sendWhatsApp,
  welcomeMessage,
  paymentReceiptMessage,

  streakLostMessage,
  attendanceReminderMessage,
  ownerWelcomeWhatsApp,
  ownerLoginAlertWhatsApp,
  trainerWelcomeWhatsApp,
};
