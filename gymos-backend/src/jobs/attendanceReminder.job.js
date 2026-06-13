const cron = require('node-cron');
const Member = require('../models/Member.model');
const Attendance = require('../models/Attendance.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp, attendanceReminderMessage } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Attendance Reminder Job
 * Runs every hour
 * Sends WhatsApp alerts to members who missed their usual check-in time by X hours
 */
const startAttendanceReminderJob = () => {
  // Run every hour at minute 0
  const cronSchedule = '0 * * * *';
  const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
  const graceHours = parseInt(process.env.ATTENDANCE_REMINDER_GRACE_HOURS || '1', 10);

  cron.schedule(cronSchedule, async () => {
    logger.info('[CronJob] Running hourly attendance reminder job...');

    try {
      const now = new Date();
      // Calculate start and end of current day in local time for precise queries
      // We will normalize it to UTC midnight for the database matching
      const todayUTC = new Date(now);
      todayUTC.setHours(0, 0, 0, 0);

      // We need to know what the current hour is in the configured timezone
      const currentHourStr = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      const currentHour = parseInt(currentHourStr, 10);

      // 1. Fetch all active members who have an established pattern and whatsapp enabled
      // AND who haven't been reminded today
      const membersToCheck = await Member.find({
        status: 'active',
        isActive: true,
        notifyWhatsApp: true,
        averageCheckInHour: { $ne: null },
        $or: [
          { lastAttendanceReminder: null },
          { lastAttendanceReminder: { $lt: todayUTC } }
        ]
      }).populate('gym', 'name');

      if (membersToCheck.length === 0) {
        return; // Nothing to do
      }

      // 2. Fetch today's attendance records for the whole system
      // To prevent massive queries, we just pull the member IDs of people who checked in today
      const todaysAttendances = await Attendance.find({ date: todayUTC }).select('member');
      const checkedInMemberIds = new Set(todaysAttendances.map(a => a.member.toString()));

      let processedCount = 0;

      // 3. Process each eligible member
      for (const member of membersToCheck) {
        // Skip if they already checked in today
        if (checkedInMemberIds.has(member._id.toString())) {
          continue;
        }

        // Check if current hour has surpassed their usual check-in hour + grace period
        if (currentHour >= (member.averageCheckInHour + graceHours)) {
          try {
            const message = attendanceReminderMessage({
              memberName: member.name,
              gymName: member.gym?.name || 'the gym',
            });

            await sendWhatsApp(member.phone, message);

            // Create in-app notification
            await Notification.create({
              member: member._id,
              gym: member.gym?._id,
              title: '🕒 Workout Reminder',
              message,
              type: 'attendance_reminder',
              sentViaWhatsApp: true,
            });

            // Update member so they don't get pinged again today
            member.lastAttendanceReminder = now;
            await member.save();

            processedCount++;
          } catch (memberError) {
            logger.error(`[AttendanceJob] Failed for member ${member.memberId}: ${memberError.message}`);
          }
        }
      }

      if (processedCount > 0) {
        logger.info(`[AttendanceJob] Sent reminders to ${processedCount} member(s)`);
      }
    } catch (error) {
      logger.error(`[AttendanceJob] Fatal error: ${error.message}`);
    }
  }, {
    timezone
  });

  logger.info(`[CronJob] Attendance reminder job scheduled (hourly in ${timezone})`);
};

module.exports = { startAttendanceReminderJob };
