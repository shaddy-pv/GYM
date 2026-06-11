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

router.post('/register', authLimiter, validate(registerOwnerSchema), registerOwner);
router.post('/login', authLimiter, validate(loginSchema), loginOwner);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/logout', optionalAuth, logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;
