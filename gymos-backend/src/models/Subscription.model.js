const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: false },
    plan: {
      type: String,
      enum: ['starter', 'pro', 'scale'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'trial'],
      default: 'trial',
    },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    maxGyms: { type: Number, default: 1 }, // starter=1, pro=3, scale=null (unlimited)
    maxMembersPerGym: { type: Number, default: 100 }, // starter=100, pro=null, scale=null
    features: {
      memberApp: { type: Boolean, default: false },
      whatsappAlerts: { type: Boolean, default: false },
      multiGym: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Virtual: is subscription currently valid?
subscriptionSchema.virtual('isValid').get(function () {
  if (this.status === 'trial') {
    return !this.trialEndsAt || new Date() < this.trialEndsAt;
  }
  if (this.status === 'active') {
    return !this.currentPeriodEnd || new Date() < this.currentPeriodEnd;
  }
  return false;
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

subscriptionSchema.methods.isFeatureAllowed = function(featureName) {
  const isActive = this.status === 'active' || this.status === 'trial';
  return isActive && this.features[featureName] === true;
};

subscriptionSchema.methods.isWithinLimits = function(type, currentCount) {
  if (type === 'gyms') {
    return this.maxGyms === null || currentCount < this.maxGyms;
  }
  if (type === 'members') {
    return this.maxMembersPerGym === null || currentCount < this.maxMembersPerGym;
  }
  return false;
};

subscriptionSchema.index({ owner: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
