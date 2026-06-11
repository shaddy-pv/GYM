const cron = require('node-cron');
const Member = require('../models/Member.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp, streakLostMessage } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Streak Reset Job
 * Runs every day at 11:59 PM
 * Resets streaks for members who didn't check in today
 * Sends notification if streak > 3 before reset
 */
const startStreakResetJob = () => {
  cron.schedule('29 18 * * *', async () => {
    logger.info('[CronJob] Running streak reset job...');

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Find members with streaks who didn't check in today
      const membersToReset = await Member.find({
        currentStreak: { $gt: 0 },
        isActive: true,
        $or: [
          { lastCheckIn: { $lt: todayStart } },
          { lastCheckIn: null },
        ],
      }).populate('gym', 'name');

      let resetCount = 0;

      for (const member of membersToReset) {
        try {
          const streakBeforeReset = member.currentStreak;

          // Send notification if streak was significant (> 3 days)
          if (streakBeforeReset > 3) {
            const message = streakLostMessage({
              memberName: member.name,
              streak: streakBeforeReset,
            });

            if (member.notifyWhatsApp) {
              await sendWhatsApp(member.phone, message);
            }

            await Notification.create({
              member: member._id,
              gym: member.gym?._id,
              title: `😢 Your ${streakBeforeReset}-day streak was lost!`,
              message: `Hi ${member.name}! Your ${streakBeforeReset}-day streak was reset because you missed today's workout. Start fresh tomorrow! 💪`,
              type: 'streak_alert',
              sentViaWhatsApp: member.notifyWhatsApp,
            });
          }

          // Reset streak
          await Member.findByIdAndUpdate(member._id, { currentStreak: 0 });
          resetCount++;
        } catch (memberError) {
          logger.error(`[StreakJob] Failed for member ${member.memberId}: ${memberError.message}`);
        }
      }

      logger.info(`[StreakJob] Reset streaks for ${resetCount}/${membersToReset.length} members`);
    } catch (error) {
      logger.error(`[StreakJob] Fatal error: ${error.message}`);
    }
  });

  logger.info('[CronJob] Streak reset job scheduled (daily 11:59 PM IST / 6:29 PM UTC)');
};

module.exports = { startStreakResetJob };
