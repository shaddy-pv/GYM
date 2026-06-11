const cron = require('node-cron');
const Member = require('../models/Member.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp, expiryReminderMessage } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Expiry Reminder Job
 * Runs every day at 9:00 AM
 * Sends WhatsApp alerts for members expiring in 7, 3, and 0 days
 */
const startExpiryReminderJob = () => {
  cron.schedule('30 3 * * *', async () => {
    logger.info('[CronJob] Running expiry reminder job...');

    try {
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const milestones = [
        { daysLeft: 7, label: '7 days' },
        { daysLeft: 3, label: '3 days' },
        { daysLeft: 0, label: 'TODAY' },
      ];

      for (const { daysLeft } of milestones) {
        const targetDate = new Date(now.getTime() + daysLeft * dayMs);
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        const members = await Member.find({
          expiryDate: { $gte: start, $lte: end },
          status: 'active',
          isActive: true,
        }).populate('gym', 'name');

        for (const member of members) {
          try {
            const message = expiryReminderMessage({
              gymName: member.gym?.name || 'Your Gym',
              memberName: member.name,
              daysLeft,
              expiryDate: member.expiryDate,
            });

            if (member.notifyWhatsApp) {
              await sendWhatsApp(member.phone, message);
            }

            // Create notification record
            await Notification.create({
              member: member._id,
              gym: member.gym?._id,
              title: daysLeft === 0 ? '⚠️ Membership Expires Today!' : `⚠️ Membership Expiring in ${daysLeft} Days`,
              message,
              type: 'membership_expiry',
              sentViaWhatsApp: member.notifyWhatsApp,
            });
          } catch (memberError) {
            logger.error(`[ExpiryJob] Failed for member ${member.memberId}: ${memberError.message}`);
          }
        }

        logger.info(`[ExpiryJob] Processed ${members.length} members expiring in ${daysLeft} day(s)`);
      }
    } catch (error) {
      logger.error(`[ExpiryJob] Fatal error: ${error.message}`);
    }
  });

  logger.info('[CronJob] Expiry reminder job scheduled (daily 9:00 AM IST / 3:30 AM UTC)');
};

module.exports = { startExpiryReminderJob };
