const Member = require('../models/Member.model');

/**
 * Generate a unique member ID for a gym
 * Format: GYMSLUG-MXXX (e.g., "iron-temple-M042")
 * Slug is limited to first 10 chars (uppercased) for brevity
 *
 * @param {string} gymSlug - The gym's slug
 * @returns {Promise<string>}
 */
const generateMemberId = async (gymSlug) => {
  // Shorten and uppercase slug portion
  const slugPrefix = gymSlug.replace(/-/g, '').substring(0, 6).toUpperCase();

  // Count existing members with this prefix to get next number
  const count = await Member.countDocuments({ memberId: new RegExp(`^${slugPrefix}-M`) });
  const nextNumber = (count + 1).toString().padStart(3, '0');

  const candidateId = `${slugPrefix}-M${nextNumber}`;

  // Ensure uniqueness (race condition guard)
  const existing = await Member.findOne({ memberId: candidateId });
  if (existing) {
    // Fallback: use timestamp suffix
    return `${slugPrefix}-M${Date.now().toString().slice(-5)}`;
  }

  return candidateId;
};

module.exports = { generateMemberId };
