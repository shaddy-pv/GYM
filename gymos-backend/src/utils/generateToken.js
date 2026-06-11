const jwt = require('jsonwebtoken');

// ─── Startup Security Validation ─────────────────────────────────────────────
const _validateSecret = (name, value) => {
  if (!value || value.length < 32 || value.includes('change_in_production') || value.includes('xxx')) {
    throw new Error(
      `FATAL: ${name} is missing or insecure. ` +
      `Generate a strong secret with: node -e "require('crypto').randomBytes(64).toString('hex')"`,
    );
  }
};

_validateSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
_validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);

/**
 * Generate a short-lived access token
 * @param {object} payload - { id, role }
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

/**
 * Generate a long-lived refresh token
 * @param {object} payload - { id, role }
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
};

/**
 * Generate both tokens at once
 */
const generateTokenPair = (payload) => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});

module.exports = { generateAccessToken, generateRefreshToken, generateTokenPair };
