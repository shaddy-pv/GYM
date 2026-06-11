const mongoose = require('mongoose');

const mealLogSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    mealPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', required: true },
    date: { type: Date, required: true },
    day: { type: String, required: true },
    
    totalMeals: { type: Number, required: true },
    completedMeals: [
      {
        mealName: { type: String, required: true },
        pointsEarned: { type: Number, default: 0 },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    
    completedCount: { type: Number, default: 0 },
    isFullyCompleted: { type: Boolean, default: false },
    bonusPointsAwarded: { type: Boolean, default: false },
    totalPointsEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

mealLogSchema.index({ member: 1, date: 1 });
mealLogSchema.index({ gym: 1 });

const MealLog = mongoose.model('MealLog', mealLogSchema);
module.exports = MealLog;
