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
  `*Login:* ${process.env.MEMBER_URL || 'app.gymOS.com'}\n\n` +
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

const expiryReminderMessage = ({ gymName, memberName, daysLeft, expiryDate }) =>
  `⚠️ *Membership Expiry Reminder*\n\n` +
  `Hi ${memberName}!\n` +
  `Your ${gymName} membership expires ${daysLeft === 0 ? 'TODAY' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}.\n` +
  `Expiry Date: ${new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
  `Renew now to keep your streak! 🔥`;

const feeReminderMessage = ({ gymName, memberName, expiredDate }) =>
  `🔴 *Membership Expired*\n\n` +
  `Hi ${memberName}!\n` +
  `Your ${gymName} membership expired on ${new Date(expiredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n` +
  `Renew now to continue your fitness journey! 💪\n` +
  `Contact: ${process.env.ADMIN_URL || 'admin.gymOS.com'}`;

const streakLostMessage = ({ memberName, streak }) =>
  `😢 *Streak Lost!*\n\n` +
  `Hi ${memberName}!\n` +
  `Your ${streak}-day workout streak was reset.\n` +
  `Don't give up — start a new streak today! 🔥\n` +
  `We believe in you! 💪`;

module.exports = {
  sendWhatsApp,
  welcomeMessage,
  paymentReceiptMessage,
  expiryReminderMessage,
  feeReminderMessage,
  streakLostMessage,
};
