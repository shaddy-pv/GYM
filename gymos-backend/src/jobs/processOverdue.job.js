const cron = require('node-cron');
const Payment = require('../models/Payment.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Process Overdue Job
 * Runs daily at 2:00 AM
 * Marks pending/partially_paid dues as overdue if they pass their due date,
 * and sends configured reminders.
 */
const startProcessOverdueJob = () => {
  const cronSchedule = '0 2 * * *'; // 2:00 AM daily
  const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
  
  // E.g., '1,3,7' -> [1, 3, 7]
  const reminderDaysStr = process.env.REMINDER_DAYS_AFTER_OVERDUE || '1,3,7';
  const reminderDays = reminderDaysStr.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

  cron.schedule(cronSchedule, async () => {
    logger.info('[CronJob] Running process overdue job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Find all pending/partially_paid dues that are past their due date
      const overduePayments = await Payment.find({
        status: { $in: ['pending', 'partially_paid'] },
        dueDate: { $lt: today, $ne: null }
      }).populate('member').populate('gym');

      let markedOverdueCount = 0;
      let reminderCount = 0;

      for (const payment of overduePayments) {
        // Status Transition
        if (payment.status !== 'overdue') {
          payment.status = 'overdue';
          await payment.save();
          markedOverdueCount++;
        }

        // Reminder Logic
        const dueDate = new Date(payment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = Math.abs(today - dueDate);
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (reminderDays.includes(daysOverdue)) {
          const member = payment.member;
          const gym = payment.gym;

          // In-app Notification
          await Notification.create({
            member: member._id,
            gym: gym._id,
            title: '⚠️ Payment Overdue',
            message: `Your payment of ₹${payment.balanceAmount} was due on ${dueDate.toLocaleDateString()}. Please clear it immediately.`,
            type: 'fee_reminder',
          });

          // WhatsApp Notification
          if (member && member.notifyWhatsApp) {
            const msg = `⚠️ *Action Required* ⚠️\n\nHi ${member.name},\n` +
                        `Your membership payment of ₹${payment.balanceAmount} at ${gym.name} is overdue by ${daysOverdue} day(s).\n\n` +
                        `Please clear your dues as soon as possible to avoid service interruption.\n\nThank you!`;
            await sendWhatsApp(member.phone, msg).catch(() => {});
          }

          reminderCount++;
        }
      }

      logger.info(`[ProcessOverdueJob] Marked ${markedOverdueCount} accounts as overdue. Sent ${reminderCount} reminders.`);
    } catch (error) {
      logger.error(`[ProcessOverdueJob] Fatal error: ${error.message}`);
    }
  }, {
    timezone
  });

  logger.info(`[CronJob] Process overdue job scheduled (2:00 AM in ${timezone})`);
};

module.exports = { startProcessOverdueJob };
