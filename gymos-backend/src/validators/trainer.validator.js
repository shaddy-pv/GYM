const { z } = require('zod');

const createTrainerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  specialization: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return val;
  }, z.array(z.string().trim()).optional()),
  experience: z.coerce.number().min(0).max(50).optional(),
});

const updateTrainerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional().or(z.literal('')),
  specialization: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return val;
  }, z.array(z.string().trim()).optional()),
  experience: z.coerce.number().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
});

module.exports = { createTrainerSchema, updateTrainerSchema };
