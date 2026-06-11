const mongoose = require('mongoose');

const completedExerciseSchema = new mongoose.Schema(
  {
    exerciseName: { type: String },
    pointsEarned: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workoutLogSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    exercisePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'ExercisePlan', default: null },
    date: { type: Date, required: true },
    day: { type: String }, // "monday"
    completedExercises: [completedExerciseSchema],
    totalExercises: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    isFullyCompleted: { type: Boolean, default: false },
    bonusPointsAwarded: { type: Boolean, default: false },
    totalPointsEarned: { type: Number, default: 0 },
  },
  { timestamps: true },
);

workoutLogSchema.index({ member: 1, date: 1 }, { unique: true });
workoutLogSchema.index({ gym: 1, date: 1 });

const WorkoutLog = mongoose.model('WorkoutLog', workoutLogSchema);
module.exports = WorkoutLog;
