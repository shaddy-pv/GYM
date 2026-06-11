const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, default: null },
    reps: { type: Number, default: null },
    durationSeconds: { type: Number, default: null },
    restSeconds: { type: Number, default: 60 },
    pointsValue: { type: Number, default: 15 },
    instructions: { type: String, trim: true },
    muscleGroup: { type: String, trim: true },
    demoImageUrl: { type: String, default: null },
  },
  { _id: true },
);

const dayScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    isRestDay: { type: Boolean, default: false },
    focusArea: { type: String, trim: true }, // "Chest & Triceps"
    exercises: [exerciseSchema],
  },
  { _id: true },
);

const exercisePlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true },
    goal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'maintenance', 'flexibility', 'endurance'],
      default: null,
    },
    daysPerWeek: { type: Number, default: null },
    schedule: [dayScheduleSchema],
    isTemplate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

exercisePlanSchema.index({ gym: 1, isActive: 1 });
exercisePlanSchema.index({ gym: 1, isTemplate: 1 });

const ExercisePlan = mongoose.model('ExercisePlan', exercisePlanSchema);
module.exports = ExercisePlan;
