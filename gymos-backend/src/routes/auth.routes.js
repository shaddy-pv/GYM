const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerOwner, loginOwner, refreshToken, logout, forgotPassword, resetPassword, memberLogin } = require('../controllers/auth.controller');
const { protect, protectMember, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerOwnerSchema,
  loginSchema,
  memberLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Extra strict limiter for forgot/reset password
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 100 : 10, // 10 requests per hour
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerOwnerSchema), registerOwner);
router.post('/login', authLimiter, validate(loginSchema), loginOwner);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/logout', optionalAuth, logout);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;
