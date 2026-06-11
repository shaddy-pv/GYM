const Member = require('../models/Member.model');
const Attendance = require('../models/Attendance.model');
const { successResponse } = require('../utils/ApiResponse');
const mongoose = require('mongoose');

// ─── Get Leaderboard ──────────────────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const gymId = new mongoose.Types.ObjectId(req.params.gymId);
    const { period = 'all', scope = 'gym' } = req.query;

    let gymFilter = {};
    if (scope === 'gym') {
      gymFilter = { gym: gymId };
    }

    // For week/month period, compute points from attendance + workout logs
    // For 'all', use member.totalPoints directly

    let leaderboardData;

    if (period === 'all') {
      leaderboardData = await Member.find({ ...gymFilter, isActive: true })
        .populate('gym', 'name')
        .select('name memberId profilePhoto totalPoints currentStreak longestStreak badges gym')
        .sort({ totalPoints: -1 })
        .limit(20);
    } else {
      // Compute period-based points from PointsHistory
      const PointsHistory = require('../models/PointsHistory.model');

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

      leaderboardData = await PointsHistory.aggregate([
        { $match: { ...gymFilter, createdAt: dateFilter } },
        { $group: { _id: '$member', periodPoints: { $sum: '$points' } } },
        { $sort: { periodPoints: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'members',
            localField: '_id',
            foreignField: '_id',
            as: 'member',
          },
        },
        { $unwind: '$member' },
        {
          $lookup: {
            from: 'gyms',
            localField: 'member.gym',
            foreignField: '_id',
            as: 'gymData',
          },
        },
        { $unwind: { path: '$gymData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$member._id',
            name: '$member.name',
            gymName: '$gymData.name',
            memberId: '$member.memberId',
            profilePhoto: '$member.profilePhoto',
            currentStreak: '$member.currentStreak',
            badges: '$member.badges',
            totalPoints: '$member.totalPoints',
            periodPoints: 1,
          },
        },
      ]);
    }

    // Add rank and normalize points field
    const ranked = leaderboardData.map((member, index) => {
      const m = member.toObject?.() || member;
      return {
        rank: index + 1,
        ...m,
        points: m.periodPoints !== undefined ? m.periodPoints : m.totalPoints,
        gymName: m.gymName || m.gym?.name || null,
      };
    });

    // Find requesting member's rank (if member-auth route)
    let myRank = null;
    if (req.member) {
      const myMemberId = req.member._id.toString();
      const myEntry = ranked.find((m) => m._id?.toString() === myMemberId || m.memberId === req.member.memberId);
      if (myEntry) {
        myRank = myEntry.rank;
      } else {
        // They're outside top 20, compute their rank
        const myMember = await Member.findById(myMemberId).select('totalPoints');
        const higherCount = await Member.countDocuments({
          gym: gymId,
          totalPoints: { $gt: myMember.totalPoints },
          isActive: true,
        });
        myRank = higherCount + 1;
      }
    }

    return successResponse(res, 'Leaderboard fetched', {
      period,
      leaderboard: ranked,
      myRank,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaderboard };
