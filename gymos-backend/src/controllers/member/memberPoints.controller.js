const Member = require('../../models/Member.model');
const PointsHistory = require('../../models/PointsHistory.model');
const Gym = require('../../models/Gym.model');
const Attendance = require('../../models/Attendance.model');
const { BADGE_REGISTRY } = require('../../utils/checkAndAwardBadges');
const { successResponse, paginatedResponse, buildPagination } = require('../../utils/ApiResponse');
const mongoose = require('mongoose');

// ─── GET / — Points Summary ───────────────────────────────────────────────────
const getPointsSummary = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const gymId = req.member.gym;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisWeekResult, thisMonthResult, gym] = await Promise.all([
      PointsHistory.aggregate([
        { $match: { member: new mongoose.Types.ObjectId(memberId), createdAt: { $gte: weekAgo }, points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      PointsHistory.aggregate([
        { $match: { member: new mongoose.Types.ObjectId(memberId), createdAt: { $gte: monthStart }, points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      Gym.findById(gymId),
    ]);

    // Compute rank
    const higherCount = await Member.countDocuments({
      gym: gymId,
      isActive: true,
      totalPoints: { $gt: req.member.totalPoints },
    });
    const rank = higherCount + 1;

    const pc = gym.pointsConfig;
    const howToEarn = [
      { action: 'Complete exercise', points: pc?.perExercise ?? 15 },
      { action: 'Daily attendance check-in', points: pc?.perAttendance ?? 10 },
      { action: 'Complete full workout', points: pc?.fullWorkoutBonus ?? 50 },
      { action: `${pc?.streakBonus?.days ?? 7}-day streak bonus`, points: pc?.streakBonus?.points ?? 100 },
    ];

    return successResponse(res, 'Points summary fetched', {
      totalPoints: req.member.totalPoints,
      thisWeek: thisWeekResult[0]?.total || 0,
      thisMonth: thisMonthResult[0]?.total || 0,
      rank,
      currentStreak: req.member.currentStreak,
      longestStreak: req.member.longestStreak,
      badges: req.member.badges,
      howToEarn,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /history — Grouped by date ──────────────────────────────────────────
const getPointsHistory = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      PointsHistory.find({ member: memberId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PointsHistory.countDocuments({ member: memberId }),
    ]);

    // Group by date for timeline display
    const groupedMap = new Map();
    for (const record of records) {
      const dateKey = record.createdAt.toISOString().split('T')[0];
      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, { date: dateKey, records: [], dayTotal: 0 });
      }
      const group = groupedMap.get(dateKey);
      group.records.push({
        type: record.type,
        description: record.description,
        points: record.points,
        createdAt: record.createdAt,
      });
      if (record.points > 0) group.dayTotal += record.points;
    }

    const history = Array.from(groupedMap.values());

    return paginatedResponse(
      res,
      'Points history fetched',
      { totalPoints: req.member.totalPoints, history },
      buildPagination(total, pageNum, limitNum),
    );
  } catch (error) {
    next(error);
  }
};

// ─── GET /badges ──────────────────────────────────────────────────────────────
const getBadges = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const gymId = req.member.gym;
    const earned = req.member.badges || [];

    const earnedList = [];
    const lockedList = [];

    for (const [badgeId, badge] of Object.entries(BADGE_REGISTRY)) {
      if (earned.includes(badgeId)) {
        // Find when they earned it from PointsHistory (approximation via notification)
        earnedList.push({
          ...badge,
          earned: true,
        });
      } else {
        // Compute progress hint
        let progress = null;

        if (badgeId === 'on_fire') {
          progress = `Current streak: ${req.member.currentStreak}/7 days`;
        } else if (badgeId === 'streak_master') {
          progress = `Current streak: ${req.member.currentStreak}/30 days`;
        } else if (badgeId === 'consistent') {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const count = await Attendance.countDocuments({ member: memberId, date: { $gte: monthStart } });
          progress = `This month: ${count}/25 days`;
        } else if (badgeId === 'beast_mode') {
          const totalMembers = await Member.countDocuments({ gym: gymId, isActive: true });
          const higherCount = await Member.countDocuments({ gym: gymId, isActive: true, totalPoints: { $gt: req.member.totalPoints } });
          const rank = higherCount + 1;
          const top10 = Math.ceil(totalMembers * 0.1);
          progress = `Rank #${rank} — need top ${top10} of ${totalMembers} members`;
        } else if (badgeId === 'champion') {
          const higherCount = await Member.countDocuments({ gym: gymId, isActive: true, totalPoints: { $gt: req.member.totalPoints } });
          progress = higherCount === 0 ? 'Almost there!' : `Rank #${higherCount + 1} — need rank #1`;
        }

        lockedList.push({ ...badge, earned: false, progress });
      }
    }

    return successResponse(res, 'Badges fetched', { earned: earnedList, locked: lockedList });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPointsSummary, getPointsHistory, getBadges };
