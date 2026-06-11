const express = require('express');
const rateLimit = require('express-rate-limit');
const { memberLogin, refreshToken } = require('../../controllers/auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { memberLoginSchema, refreshTokenSchema } = require('../../validators/auth.validator');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(memberLoginSchema), memberLogin);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

module.exports = router;
