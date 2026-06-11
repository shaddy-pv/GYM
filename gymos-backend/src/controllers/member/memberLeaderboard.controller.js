const Member = require('../../models/Member.model');
const PointsHistory = require('../../models/PointsHistory.model');
const mongoose = require('mongoose');
const { successResponse } = require('../../utils/ApiResponse');

/**
 * Mask member name for privacy: "Rahul Singh" → "Rahul S"
 */
const maskName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

// ─── GET / ─────────────────────────────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const gymId = new mongoose.Types.ObjectId(req.member.gym);
    const memberId = req.member._id;
    const { period = 'month', scope = 'gym' } = req.query;

    let gymFilter = {};
    if (scope === 'gym') {
      gymFilter = { gym: gymId };
    }

    let leaderboardRaw = [];

    if (period === 'all') {
      // Use member.totalPoints directly
      leaderboardRaw = await Member.find({ ...gymFilter, isActive: true })
        .populate('gym', 'name')
        .select('name profilePhoto totalPoints currentStreak badges gym')
        .sort({ totalPoints: -1 })
        .limit(20)
        .lean();

      leaderboardRaw = leaderboardRaw.map((m) => ({
        _id: m._id,
        name: maskName(m.name),
        gymName: m.gym?.name || null,
        profilePhoto: m.profilePhoto || null,
        points: m.totalPoints,
        currentStreak: m.currentStreak,
        badges: m.badges,
      }));
    } else {
      // Period-based from PointsHistory
      let dateFilter = {};
      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { $gte: weekAgo };
      } else if (period === 'month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        dateFilter = { $gte: monthStart };
      }

      const aggregated = await PointsHistory.aggregate([
        { $match: { ...gymFilter, createdAt: dateFilter, points: { $gt: 0 } } },
        { $group: { _id: '$member', periodPoints: { $sum: '$points' } } },
        { $sort: { periodPoints: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'members',
            localField: '_id',
            foreignField: '_id',
            as: 'memberData',
          },
        },
        { $unwind: '$memberData' },
        { $match: { 'memberData.isActive': true } },
        {
          $lookup: {
            from: 'gyms',
            localField: 'memberData.gym',
            foreignField: '_id',
            as: 'gymData',
          },
        },
        { $unwind: { path: '$gymData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$memberData._id',
            name: '$memberData.name',
            gymName: '$gymData.name',
            profilePhoto: '$memberData.profilePhoto',
            currentStreak: '$memberData.currentStreak',
            badges: '$memberData.badges',
            totalPoints: '$memberData.totalPoints',
            points: '$periodPoints',
          },
        },
      ]);

      leaderboardRaw = aggregated.map((m) => ({
        _id: m._id,
        name: maskName(m.name),
        gymName: m.gymName || null,
        profilePhoto: m.profilePhoto || null,
        points: m.points,
        currentStreak: m.currentStreak,
        badges: m.badges,
      }));
    }

    // Rank and find requesting member's position
    const ranked = leaderboardRaw.map((m, i) => ({ rank: i + 1, ...m }));

    // My rank
    const myEntry = ranked.find((m) => m._id.toString() === memberId.toString());
    let myRank = myEntry?.rank || null;
    let myPoints = 0;

    if (period === 'all') {
      myPoints = req.member.totalPoints;
      if (!myEntry) {
        const higherCount = await Member.countDocuments({
          ...gymFilter,
          isActive: true,
          totalPoints: { $gt: myPoints },
        });
        myRank = higherCount + 1;
      }
    } else {
      // Compute period points for self if not in top 20
      const myStart = period === 'week'
        ? (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })()
        : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();

      const myPeriodPoints = await PointsHistory.aggregate([
        { $match: { member: new mongoose.Types.ObjectId(memberId), gym: gymId, createdAt: { $gte: myStart }, points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]);
      myPoints = myPeriodPoints[0]?.total || 0;

      if (!myEntry) {
        const higherCount = await PointsHistory.aggregate([
          { $match: { ...gymFilter, createdAt: { $gte: myStart }, points: { $gt: 0 } } },
          { $group: { _id: '$member', total: { $sum: '$points' } } },
          { $match: { total: { $gt: myPoints } } },
          { $count: 'higher' },
        ]);
        myRank = (higherCount[0]?.higher || 0) + 1;
      }
    }

    // Points to next rank
    let pointsToNextRank = null;
    if (myRank && myRank > 1) {
      const nextRankEntry = ranked.find((m) => m.rank === myRank - 1);
      if (nextRankEntry) {
        pointsToNextRank = nextRankEntry.points - myPoints;
      }
    }

    return successResponse(res, 'Leaderboard fetched', {
      period,
      updatedAt: new Date(),
      myRank,
      myPoints,
      pointsToNextRank: pointsToNextRank > 0 ? pointsToNextRank : null,
      topMembers: ranked,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaderboard };
