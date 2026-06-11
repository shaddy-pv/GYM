const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const memberSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null },
    membershipPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', default: null },

    // Auth
    memberId: { type: String, unique: true, required: true }, // "GYM001-M042"
    password: { type: String, required: true, select: false },
    refreshToken: { type: String, select: false, default: null },

    // Personal Info
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['male', 'female', 'other'], default: null },
    profilePhoto: { type: String, default: null },

    // Health
    height: { type: Number, default: null }, // cm
    weight: { type: Number, default: null }, // kg
    goals: [
      {
        type: String,
        enum: ['weight_loss', 'muscle_gain', 'maintenance', 'flexibility', 'endurance'],
      },
    ],
    healthNotes: { type: String, trim: true },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // Membership
    joinDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active',
    },

    // Gamification
    totalPoints: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCheckIn: { type: Date, default: null },
    badges: [
      {
        type: String,
        enum: ['on_fire', 'beast_mode', 'consistent', 'champion', 'streak_master'],
      },
    ],

    // Plans
    exercisePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'ExercisePlan', default: null },
    mealPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', default: null },

    // Notification prefs
    notifyWhatsApp: { type: Boolean, default: true },
    notifyEmail: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Hash password before save
memberSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
memberSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON
memberSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

memberSchema.index({ gym: 1 });
memberSchema.index({ owner: 1 });
memberSchema.index({ gym: 1, phone: 1 }, { unique: true });
memberSchema.index({ gym: 1, status: 1 });
memberSchema.index({ expiryDate: 1 });
const Member = mongoose.model('Member', memberSchema);
module.exports = Member;
