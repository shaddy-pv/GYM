const { z } = require('zod');

const GOALS = ['weight_loss', 'muscle_gain', 'maintenance', 'flexibility', 'endurance'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ─── Membership Plan ─────────────────────────────────────────────────────────

const createMembershipPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  durationDays: z.number().int().positive('Duration must be a positive number of days'),
  price: z.number().positive('Price must be positive'),
  description: z.string().max(500).optional(),
  features: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
});

const updateMembershipPlanSchema = createMembershipPlanSchema.partial();

// ─── Exercise Plan ───────────────────────────────────────────────────────────

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name required'),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
  restSeconds: z.number().min(0).optional(),
  pointsValue: z.number().min(0).optional(),
  instructions: z.string().max(500).optional(),
  muscleGroup: z.string().optional(),
  demoImageUrl: z.string().url().optional().or(z.literal('')),
});

const dayScheduleSchema = z.object({
  day: z.enum(DAYS),
  isRestDay: z.boolean().optional(),
  focusArea: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
});

const createExercisePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  goal: z.enum(GOALS).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  schedule: z.array(dayScheduleSchema).optional(),
  isTemplate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateExercisePlanSchema = createExercisePlanSchema.partial();

// ─── Meal Plan ───────────────────────────────────────────────────────────────

const mealItemSchema = z.object({
  name: z.string().optional(),
  quantity: z.string().optional(),
  calories: z.number().nonnegative().optional(),
});

const mealSchema = z.object({
  type: z.enum(['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner']),
  time: z.string().optional(),
  calories: z.number().nonnegative().optional(),
  items: z.array(mealItemSchema).optional(),
  notes: z.string().max(500).optional(),
});

const createMealPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  goal: z.enum(GOALS).optional(),
  totalCalories: z.number().nonnegative().optional(),
  macros: z
    .object({
      protein: z.number().nonnegative().optional(),
      carbs: z.number().nonnegative().optional(),
      fat: z.number().nonnegative().optional(),
    })
    .optional(),
  meals: z.array(mealSchema).optional(),
  waterIntakeLiters: z.number().positive().optional(),
  additionalNotes: z.string().max(1000).optional(),
  isTemplate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateMealPlanSchema = createMealPlanSchema.partial();

module.exports = {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  createExercisePlanSchema,
  updateExercisePlanSchema,
  createMealPlanSchema,
  updateMealPlanSchema,
};
