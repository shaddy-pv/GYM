const jwt = require('jsonwebtoken');

// ─── Secure Fallback Secrets (used only if env vars are not set) ──────────────
// These are strong 512-bit cryptographic secrets.
// For production, always override via environment variables on Render/Vercel.
const FALLBACK_ACCESS_SECRET =
  '3c3893b4f2b11639d9b542f522c8d8455af7ef730c5c2fb75149d6f6ff9b989d41330cb969a3f12b48c85680136234290032bdd186af869a0f439549b88bc9ed';
const FALLBACK_REFRESH_SECRET =
  '5564ce3556904207afc6a68ce10e5d13b54251c373d6f4a58753d6a78a2a1e1d40810932a34fd07e4380782253f582bfb58fa7c38830157dce4b5ad9f10d20b7';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || FALLBACK_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || FALLBACK_REFRESH_SECRET;

// Warn (not crash) if using fallback secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET) {
    console.warn('[WARN] JWT_ACCESS_SECRET not set — using built-in fallback. Set this env var for full security isolation.');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    console.warn('[WARN] JWT_REFRESH_SECRET not set — using built-in fallback. Set this env var for full security isolation.');
  }
}

/**
 * Generate a short-lived access token
 * @param {object} payload - { id, role }
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

/**
 * Generate a long-lived refresh token
 * @param {object} payload - { id, role }
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
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

