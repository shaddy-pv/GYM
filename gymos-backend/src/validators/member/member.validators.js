const { z } = require('zod');

// ─── Profile Update ────────────────────────────────────────────────────────────
const updateMemberProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  height: z.number().positive().max(300, 'Height must be ≤ 300 cm').optional(),
  weight: z.number().positive().max(500, 'Weight must be ≤ 500 kg').optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  notifyWhatsApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});

// ─── Change Password ───────────────────────────────────────────────────────────
const changeMemberPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

module.exports = {
  updateMemberProfileSchema,
  changeMemberPasswordSchema,
};
