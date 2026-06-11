const Member = require('../models/Member.model');
const Attendance = require('../models/Attendance.model');
const Notification = require('../models/Notification.model');
const PointsHistory = require('../models/PointsHistory.model');
const Gym = require('../models/Gym.model');
const logger = require('../config/logger');

/**
 * Badge metadata registry
 */
const BADGE_REGISTRY = {
  on_fire: {
    id: 'on_fire',
    name: 'On Fire',
    description: '7-day attendance streak',
    icon: '🔥',
  },
  consistent: {
    id: 'consistent',
    name: 'Consistent',
    description: '25+ days attended this month',
    icon: '📅',
  },
  beast_mode: {
    id: 'beast_mode',
    name: 'Beast Mode',
    description: 'Top 10% of your gym',
    icon: '💪',
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    description: 'Rank #1 in your gym (all time)',
    icon: '🏆',
  },
  streak_master: {
    id: 'streak_master',
    name: 'Streak Master',
    description: '30-day attendance streak',
    icon: '⚡',
  },
};

/**
 * Check badge eligibility and award any new badges.
 * Safe to call after any points-earning action.
 *
 * @param {object} member - Mongoose member document (pre-update, use updatedValues)
 * @param {object} updatedValues - { currentStreak, longestStreak, totalPoints }
 * @param {string} gymId
 * @returns {Promise<string[]>} - Array of newly awarded badge IDs
 */
const checkAndAwardBadges = async (member, updatedValues, gymId) => {
  const newBadges = [];

  try {
    const { currentStreak = 0, totalPoints = 0 } = updatedValues;
    const existingBadges = member.badges || [];

    // ─── on_fire: 7-day streak ───────────────────────────────────────────────
    if (currentStreak >= 7 && !existingBadges.includes('on_fire')) {
      newBadges.push('on_fire');
    }

    // ─── streak_master: 30-day streak ────────────────────────────────────────
    if (currentStreak >= 30 && !existingBadges.includes('streak_master')) {
      newBadges.push('streak_master');
    }

    // ─── consistent: 25+ attendance days this month ──────────────────────────
    if (!existingBadges.includes('consistent')) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const monthAttendance = await Attendance.countDocuments({
        member: member._id,
        date: { $gte: monthStart, $lte: monthEnd },
      });
      if (monthAttendance >= 25) {
        newBadges.push('consistent');
      }
    }

    // ─── beast_mode: top 10% of gym ─────────────────────────────────────────
    if (!existingBadges.includes('beast_mode')) {
      const totalMembers = await Member.countDocuments({ gym: gymId, isActive: true });
      const top10Threshold = Math.ceil(totalMembers * 0.1);
      const memberRank = await Member.countDocuments({
        gym: gymId,
        isActive: true,
        totalPoints: { $gt: totalPoints },
      });
      const rank = memberRank + 1;
      if (rank <= top10Threshold && totalMembers >= 5) {
        newBadges.push('beast_mode');
      }
    }

    // ─── champion: rank #1 all time ─────────────────────────────────────────
    if (!existingBadges.includes('champion')) {
      const higherCount = await Member.countDocuments({
        gym: gymId,
        isActive: true,
        totalPoints: { $gt: totalPoints },
      });
      if (higherCount === 0 && totalPoints > 0) {
        newBadges.push('champion');
      }
    }

    if (newBadges.length === 0) return [];

    // Award badges + create notifications
    await Member.findByIdAndUpdate(member._id, {
      $addToSet: { badges: { $each: newBadges } },
    });

    for (const badgeId of newBadges) {
      const badge = BADGE_REGISTRY[badgeId];
      try {
        await Notification.create({
          member: member._id,
          gym: gymId,
          title: `${badge.icon} Badge Earned: ${badge.name}!`,
          message: `Congratulations! You earned the "${badge.name}" badge. ${badge.description}`,
          type: 'badge_earned',
        });
      } catch (notifError) {
        logger.error(`Badge notification failed for ${badgeId}: ${notifError.message}`);
      }
    }

    logger.info(`Badges awarded to member ${member._id}: ${newBadges.join(', ')}`);
    return newBadges;
  } catch (error) {
    logger.error(`checkAndAwardBadges error: ${error.message}`);
    return []; // Never throw — badge failure must not break main flow
  }
};

module.exports = { checkAndAwardBadges, BADGE_REGISTRY };
