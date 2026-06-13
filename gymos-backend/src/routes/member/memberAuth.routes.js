const express = require('express');
const rateLimit = require('express-rate-limit');
const { memberLogin, refreshToken, memberForgotPassword, memberResetPassword } = require('../../controllers/auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { memberLoginSchema, refreshTokenSchema, memberForgotPasswordSchema, memberResetPasswordSchema } = require('../../validators/auth.validator');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 100 : 10, // 10 requests per hour
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(memberLoginSchema), memberLogin);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/forgot-password', passwordResetLimiter, validate(memberForgotPasswordSchema), memberForgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(memberResetPasswordSchema), memberResetPassword);

module.exports = router;
