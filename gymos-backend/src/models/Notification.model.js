const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' }, // optional for admin notifications
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    targetRole: { type: String, enum: ['member', 'admin'], default: 'member' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['workout_reminder', 'fee_due', 'membership_expiry', 'streak_alert', 'plan_updated', 'badge_earned', 'general', 'new_member', 'payment_received'],
      default: 'general',
    },
    isRead: { type: Boolean, default: false },
    sentViaWhatsApp: { type: Boolean, default: false },
    sentViaEmail: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ member: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ gym: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
