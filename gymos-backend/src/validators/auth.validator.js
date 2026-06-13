const { z } = require('zod');

const registerOwnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const memberLoginSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const memberForgotPasswordSchema = z.object({
  phoneOrEmail: z.string().min(1, 'Phone or email is required'),
});

const memberResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

module.exports = {
  registerOwnerSchema,
  loginSchema,
  memberLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  memberForgotPasswordSchema,
  memberResetPasswordSchema,
};
