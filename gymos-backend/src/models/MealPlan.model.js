const mongoose = require('mongoose');

const mealItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    quantity: { type: String, trim: true }, // "1 cup", "150g"
    calories: { type: Number, default: null },
  },
  { _id: false },
);

const mealSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
    },
    time: { type: String, trim: true }, // "7:00 AM - 9:00 AM"
    calories: { type: Number, default: null },
    items: [mealItemSchema],
    notes: { type: String, trim: true },
  },
  { _id: true },
);

const mealPlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true },
    goal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'maintenance', 'flexibility', 'endurance'],
      default: null,
    },
    totalCalories: { type: Number, default: null },
    macros: {
      protein: { type: Number, default: null }, // grams
      carbs: { type: Number, default: null },
      fat: { type: Number, default: null },
    },
    meals: [mealSchema],
    waterIntakeLiters: { type: Number, default: 3 },
    additionalNotes: { type: String, trim: true },
    isTemplate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

mealPlanSchema.index({ gym: 1, goal: 1, isActive: 1 });
mealPlanSchema.index({ gym: 1, isTemplate: 1 });

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
module.exports = MealPlan;
