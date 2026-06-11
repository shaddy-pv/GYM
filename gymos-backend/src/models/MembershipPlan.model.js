const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true }, // "Monthly", "Quarterly"
    durationDays: { type: Number, required: true }, // 30, 90, 365
    price: { type: Number, required: true },
    description: { type: String, trim: true },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

membershipPlanSchema.index({ gym: 1, isActive: 1 });
membershipPlanSchema.index({ owner: 1 });

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);
module.exports = MembershipPlan;
