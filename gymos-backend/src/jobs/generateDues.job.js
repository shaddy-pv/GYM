const cron = require('node-cron');
const Member = require('../models/Member.model');
const Payment = require('../models/Payment.model');
const MembershipPlan = require('../models/MembershipPlan.model');
const Notification = require('../models/Notification.model');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const logger = require('../config/logger');

/**
 * Generate Dues Job
 * Runs daily at 1:00 AM
 * Automatically creates pending dues for members whose expiry date is X days away.
 */
const startGenerateDuesJob = () => {
  const cronSchedule = '0 1 * * *'; // 1:00 AM daily
  const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
  const daysBefore = parseInt(process.env.AUTO_GENERATE_DUES_DAYS_BEFORE || '3', 10);

  cron.schedule(cronSchedule, async () => {
    logger.info('[CronJob] Running generate dues job...');

    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      targetDate.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Find members expiring within the target date window, who have a plan assigned
      const expiringMembers = await Member.find({
        status: 'active',
        isActive: true,
        expiryDate: { $gte: targetDate, $lte: targetDateEnd },
        membershipPlan: { $ne: null }
      }).populate('membershipPlan').populate('gym');

      let generatedCount = 0;

      for (const member of expiringMembers) {
        // Construct a unique billing key (e.g., memberId_YYYY_MM_DD_of_next_cycle)
        const nextCycleStart = new Date(member.expiryDate);
        const billingPeriodKey = `${member._id.toString()}_${nextCycleStart.getFullYear()}_${nextCycleStart.getMonth() + 1}_${nextCycleStart.getDate()}`;

        // Check if an invoice was already generated for this cycle
        const existingDue = await Payment.findOne({ billingPeriodKey });
        
        if (!existingDue) {
          const plan = member.membershipPlan;
          
          const periodEnd = new Date(nextCycleStart);
          periodEnd.setDate(periodEnd.getDate() + plan.durationDays);

          const newDue = await Payment.create({
            member: member._id,
            gym: member.gym._id,
            owner: member.owner,
            membershipPlan: plan._id,
            amount: plan.price,
            paidAmount: 0,
            balanceAmount: plan.price,
            method: 'system_generated',
            status: 'pending',
            dueDate: member.expiryDate,
            periodStart: nextCycleStart,
            periodEnd,
            billingPeriodKey,
            notes: 'Auto-generated membership renewal due',
            transactions: []
          });

          // In-app Notification
          await Notification.create({
            member: member._id,
            gym: member.gym._id,
            title: '📅 New Invoice Generated',
            message: `Your ${plan.name} membership renewal invoice of ₹${plan.price} has been generated. Due on ${newDue.dueDate.toLocaleDateString()}.`,
            type: 'fee_reminder',
          });

          // WhatsApp Notification
          if (member.notifyWhatsApp) {
            const msg = `Hey ${member.name}! 👋\n\nJust a quick heads-up that your ${plan.name} membership at ${member.gym.name} is up for renewal soon.\n\n` +
                        `An invoice for ₹${plan.price} has been generated and is due by ${newDue.dueDate.toLocaleDateString()}.\n\n` +
                        `Please clear your dues to ensure uninterrupted access. 💪`;
            await sendWhatsApp(member.phone, msg).catch(() => {});
          }

          generatedCount++;
        }
      }

      logger.info(`[GenerateDuesJob] Successfully generated ${generatedCount} new pending dues.`);
    } catch (error) {
      logger.error(`[GenerateDuesJob] Fatal error: ${error.message}`);
    }
  }, {
    timezone
  });

  logger.info(`[CronJob] Generate dues job scheduled (1:00 AM in ${timezone})`);
};

module.exports = { startGenerateDuesJob };
