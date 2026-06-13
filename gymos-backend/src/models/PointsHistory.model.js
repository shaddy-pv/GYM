const mongoose = require('mongoose');

const pointsHistorySchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    points: { type: Number, required: true },
    type: {
      type: String,
      enum: ['exercise_complete', 'attendance', 'full_workout_bonus', 'streak_bonus', 'manual_award', 'deduction', 'meal_complete', 'full_meal_bonus', 'checkout_duration'],
      required: true,
    },
    description: { type: String, trim: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // WorkoutLog or Attendance ID
  },
  { timestamps: true },
);

pointsHistorySchema.index({ member: 1, createdAt: -1 });
pointsHistorySchema.index({ gym: 1 });

const PointsHistory = mongoose.model('PointsHistory', pointsHistorySchema);
module.exports = PointsHistory;
