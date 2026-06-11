const { z } = require('zod');

const timingsSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
  daysOpen: z.array(z.string()).optional(),
});

const addressSchema = z.object({
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
});

const createGymSchema = z.object({
  name: z.string().min(2, 'Gym name must be at least 2 characters').max(100),
  address: addressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timings: timingsSchema.optional(),
});

const updateGymSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: addressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timings: timingsSchema.optional(),
  isActive: z.boolean().optional(),
});

const pointsConfigSchema = z.object({
  perExercise: z.number().min(0).max(1000).optional(),
  perAttendance: z.number().min(0).max(1000).optional(),
  fullWorkoutBonus: z.number().min(0).max(5000).optional(),
  streakBonus: z
    .object({
      days: z.number().min(1).max(365),
      points: z.number().min(0).max(10000),
    })
    .optional(),
});

module.exports = { createGymSchema, updateGymSchema, pointsConfigSchema };
