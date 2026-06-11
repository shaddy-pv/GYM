const cron = require('node-cron');
const Member = require('../models/Member.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp, feeReminderMessage } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Fee Reminder Job
 * Runs every day at 10:00 AM
 * Sends WhatsApp reminders to expired members
 */
const startFeeReminderJob = () => {
  cron.schedule('30 4 * * *', async () => {
    logger.info('[CronJob] Running fee reminder job...');

    try {
      const expiredMembers = await Member.find({
        status: 'expired',
        isActive: true,
      }).populate('gym', 'name');

      let successCount = 0;
      let errorCount = 0;

      for (const member of expiredMembers) {
        try {
          const message = feeReminderMessage({
            gymName: member.gym?.name || 'Your Gym',
            memberName: member.name,
            expiredDate: member.expiryDate,
          });

          if (member.notifyWhatsApp) {
            await sendWhatsApp(member.phone, message);
          }

          // Create notification record (avoid duplicate daily notifications)
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const existingNotif = await Notification.findOne({
            member: member._id,
            type: 'fee_due',
            createdAt: { $gte: todayStart },
          });

          if (!existingNotif) {
            await Notification.create({
              member: member._id,
              gym: member.gym?._id,
              title: '🔴 Membership Expired — Renew Now',
              message,
              type: 'fee_due',
              sentViaWhatsApp: member.notifyWhatsApp,
            });
          }

          successCount++;
        } catch (memberError) {
          logger.error(`[FeeJob] Failed for member ${member.memberId}: ${memberError.message}`);
          errorCount++;
        }
      }

      logger.info(`[FeeJob] Processed ${expiredMembers.length} expired members (${successCount} ok, ${errorCount} errors)`);
    } catch (error) {
      logger.error(`[FeeJob] Fatal error: ${error.message}`);
    }
  });

  logger.info('[CronJob] Fee reminder job scheduled (daily 10:00 AM IST / 4:30 AM UTC)');
};

module.exports = { startFeeReminderJob };
