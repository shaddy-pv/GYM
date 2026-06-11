const { z } = require('zod');

const sendNotificationSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  type: z
    .enum(['workout_reminder', 'fee_due', 'membership_expiry', 'streak_alert', 'plan_updated', 'badge_earned', 'general'])
    .optional()
    .default('general'),
  sendWhatsApp: z.boolean().optional().default(false),
  sendEmail: z.boolean().optional().default(false),
});

module.exports = { sendNotificationSchema };
