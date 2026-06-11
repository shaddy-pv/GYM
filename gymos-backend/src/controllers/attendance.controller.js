const Attendance = require('../models/Attendance.model');
const Member = require('../models/Member.model');
const PointsHistory = require('../models/PointsHistory.model');
const Notification = require('../models/Notification.model');
const {
  calcAttendancePoints,
  calcStreakBonus,
  evaluateBadges,
  updateStreak,
} = require('../utils/calculatePoints');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Mark Attendance ──────────────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const gym = req.gym;
    const { memberId, markedBy = 'owner', checkInTime } = req.body;

    // Normalize date to midnight UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Find member
    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    // Check membership status
    if (member.status === 'expired' || member.status === 'suspended') {
      return errorResponse(res, `Cannot mark attendance — member is ${member.status}`, null, 400);
    }

    // Step 2: Prevent duplicate attendance
    const existingAttendance = await Attendance.findOne({ member: memberId, date: today });
    if (existingAttendance) {
      return errorResponse(res, 'Attendance already marked for today', null, 409);
    }

    // Step 3: Calculate attendance points
    const attendancePoints = calcAttendancePoints(gym.pointsConfig);

    // Step 4: Update streak
    const { newStreak } = updateStreak(member.lastCheckIn, member.currentStreak);
    const newLongest = Math.max(newStreak, member.longestStreak);

    // Step 5: Check streak milestone bonus
    const streakBonusResult = calcStreakBonus(gym.pointsConfig, newStreak);

    const totalPointsEarned = attendancePoints + (streakBonusResult.eligible ? streakBonusResult.points : 0);

    // Step 6: Create attendance record
    const attendance = await Attendance.create({
      member: memberId,
      gym: gymId,
      owner: req.owner._id,
      date: today,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      markedBy,
      pointsAwarded: attendancePoints,
    });

    // Step 7: Evaluate badges
    const updatedMemberData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCheckIn: new Date(),
      $inc: { totalPoints: totalPointsEarned },
    };

    const tempMember = { ...member.toObject(), currentStreak: newStreak, longestStreak: newLongest, totalPoints: member.totalPoints + totalPointsEarned };
    const newBadges = evaluateBadges(tempMember);
    if (newBadges.length > 0) {
      updatedMemberData.$addToSet = { badges: { $each: newBadges } };
    }

    // Step 8: Update member
    const updatedMember = await Member.findByIdAndUpdate(memberId, updatedMemberData, { new: true });

    // Step 9: Create PointsHistory records
    await PointsHistory.create({
      member: memberId,
      gym: gymId,
      points: attendancePoints,
      type: 'attendance',
      description: `Attendance marked - ${today.toLocaleDateString()}`,
      refId: attendance._id,
    });

    if (streakBonusResult.eligible) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: streakBonusResult.points,
        type: 'streak_bonus',
        description: `${newStreak}-day streak bonus!`,
        refId: attendance._id,
      });

      // Create streak notification
      await Notification.create({
        member: memberId,
        gym: gymId,
        title: '🔥 Streak Bonus!',
        message: `Congratulations! You've reached a ${newStreak}-day streak and earned ${streakBonusResult.points} bonus points!`,
        type: 'streak_alert',
      });
    }

    if (newBadges.length > 0) {
      await Notification.create({
        member: memberId,
        gym: gymId,
        title: '🏅 New Badge Earned!',
        message: `You earned the ${newBadges.join(', ')} badge(s)!`,
        type: 'badge_earned',
      });
    }

    return successResponse(res, 'Attendance marked successfully', {
      attendance,
      member: updatedMember,
      pointsEarned: totalPointsEarned,
      streakInfo: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        streakBonusAwarded: streakBonusResult.eligible,
        streakBonusPoints: streakBonusResult.points,
      },
      newBadges,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Today's Attendance ───────────────────────────────────────────────────────
const getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ gym: req.params.gymId, date: today })
      .populate('member', 'name memberId profilePhoto phone')
      .sort({ checkInTime: 1 });

    return successResponse(res, "Today's attendance fetched", {
      count: records.length,
      records,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Member Attendance History ─────────────────────────────────────────────────
const getMemberAttendance = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { month, page = 1, limit = 31 } = req.query;

    const filter = { member: memberId, gym: req.params.gymId };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum),
      Attendance.countDocuments(filter),
    ]);

    return paginatedResponse(res, 'Attendance history fetched', records, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

// ─── Monthly Summary ───────────────────────────────────────────────────────────
const getMonthlySummary = async (req, res, next) => {
  try {
    const { month } = req.query;
    const gymId = req.params.gymId;

    let start, end;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      start = new Date(year, m - 1, 1);
      end = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const summary = await Attendance.aggregate([
      { $match: { gym: gymId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$member',
          totalDays: { $sum: 1 },
          totalPoints: { $sum: '$pointsAwarded' },
        },
      },
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
        $project: {
          _id: 0,
          memberId: '$member.memberId',
          name: '$member.name',
          phone: '$member.phone',
          totalDays: 1,
          totalPoints: 1,
        },
      },
      { $sort: { totalDays: -1 } },
    ]);

    return successResponse(res, 'Monthly summary fetched', summary);
  } catch (error) {
    next(error);
  }
};

// ─── Export CSV ───────────────────────────────────────────────────────────────
const exportAttendanceCSV = async (req, res, next) => {
  try {
    const { month } = req.query;
    const gymId = req.params.gymId;

    let filter = { gym: gymId };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(year, m - 1, 1),
        $lte: new Date(year, m, 0, 23, 59, 59),
      };
    }

    const records = await Attendance.find(filter)
      .populate('member', 'name memberId phone')
      .sort({ date: -1 });

    // Build CSV
    const csvRows = [
      'Date,Member ID,Member Name,Phone,Check In,Check Out,Marked By,Points',
      ...records.map((r) =>
        [
          r.date.toLocaleDateString('en-IN'),
          r.member?.memberId || '',
          r.member?.name || '',
          r.member?.phone || '',
          r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-IN') : '',
          r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-IN') : '',
          r.markedBy,
          r.pointsAwarded,
        ].join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${month || 'all'}.csv"`);
    return res.send(csvRows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getMemberAttendance,
  getMonthlySummary,
  exportAttendanceCSV,
};
