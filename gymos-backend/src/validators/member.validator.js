const { z } = require('zod');

// These must match exactly what the frontend goal buttons send (after snake_case conversion)
const GOALS = ['weight_loss', 'muscle_gain', 'maintenance', 'flexibility', 'endurance', 'cardio', 'strength'];

// Preprocessor: parse goals from JSON string or array, filter to valid values only
const goalsPreprocessor = z.preprocess((val) => {
  let arr = val;
  if (typeof val === 'string') {
    try { arr = JSON.parse(val); } catch { return undefined; }
  }
  if (!Array.isArray(arr)) return undefined;
  return arr.filter((g) => GOALS.includes(g));
}, z.array(z.string()).optional());

// Preprocessor: parse JSON object from string or leave as-is
const jsonObjectPreprocessor = (schema) => z.preprocess((val) => {
  if (typeof val === 'string') {
    if (!val.trim()) return undefined;
    try { return JSON.parse(val); } catch { return undefined; }
  }
  return val;
}, schema);

const createMemberSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number. Must be 10 digits starting with 6-9'),
    email: z.string().email('Invalid email').optional().or(z.literal('')).or(z.undefined()),
    membershipPlanId: z.string().min(1, 'Membership plan is required'),
    trainerId: z.string().optional().or(z.literal('')),
    joinDate: z.string().optional(),                          // UI sends this; backend ignores it (sets from now)
    dateOfBirth: z.string().optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other']).optional(),
    height: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().max(300).optional()),
    weight: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().max(500).optional()),
    goals: goalsPreprocessor,
    healthNotes: z.string().max(1000).optional().or(z.literal('')),
    emergencyContact: jsonObjectPreprocessor(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }).optional()
    ),
    notifyWhatsApp: z.preprocess(
      (v) => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().optional()
    ),
    notifyEmail: z.preprocess(
      (v) => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().optional()
    ),
  })
  .strip(); // strip unknown fields silently — no rejection for extra form fields

const updateMemberSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')).or(z.undefined()),
    trainerId: z.string().optional().or(z.literal('')),
    dateOfBirth: z.string().optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other']).optional(),
    height: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().max(300).optional()),
    weight: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().max(500).optional()),
    goals: goalsPreprocessor,
    healthNotes: z.string().max(1000).optional().or(z.literal('')),
    emergencyContact: jsonObjectPreprocessor(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }).optional()
    ),
    notifyWhatsApp: z.preprocess(
      (v) => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().optional()
    ),
    notifyEmail: z.preprocess(
      (v) => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().optional()
    ),
  })
  .strip();

module.exports = { createMemberSchema, updateMemberSchema };
