const Attendance = require('../../models/Attendance.model');
const Member = require('../../models/Member.model');
const PointsHistory = require('../../models/PointsHistory.model');
const Notification = require('../../models/Notification.model');
const Gym = require('../../models/Gym.model');
const { calcAttendancePoints, calcStreakBonus, updateStreak } = require('../../utils/calculatePoints');
const { checkAndAwardBadges } = require('../../utils/checkAndAwardBadges');
const { successResponse, errorResponse } = require('../../utils/ApiResponse');

// ─── POST /checkin ────────────────────────────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const gymId = req.member.gym;

    // Normalize today to midnight UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Check duplicate
    const existing = await Attendance.findOne({ member: memberId, date: today });
    if (existing) {
      const checkInTime = existing.checkInTime
        ? new Date(existing.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'earlier today';
      return errorResponse(
        res,
        `Already checked in today at ${checkInTime}`,
        null,
        409,
      );
    }

    // Verify membership is active
    if (req.member.status === 'expired' || req.member.status === 'suspended') {
      return errorResponse(res, `Cannot check in — membership is ${req.member.status}`, null, 403);
    }

    // Step 2: Fetch gym for points config
    const gym = await Gym.findById(gymId);

    // Step 3: Create attendance record
    const checkInTime = new Date();
    const attendance = await Attendance.create({
      member: memberId,
      gym: gymId,
      owner: req.member.owner,
      date: today,
      checkInTime,
      markedBy: 'self',
      pointsAwarded: 0, // updated below
    });

    // Step 4: Streak calculation
    const member = await Member.findById(memberId);
    const { newStreak } = updateStreak(member.lastCheckIn, member.currentStreak);
    const newLongest = Math.max(newStreak, member.longestStreak);

    // Step 5: Points calculation
    const attendancePoints = calcAttendancePoints(gym.pointsConfig);
    const streakBonusResult = calcStreakBonus(gym.pointsConfig, newStreak);
    const totalPoints = attendancePoints + (streakBonusResult.eligible ? streakBonusResult.points : 0);

    // Step 5.5: Calculate usual check-in hour based on last 5 attendances
    const recentAttendances = await Attendance.find({ member: memberId }).sort({ date: -1 }).limit(5);
    const avgHour = recentAttendances.reduce((acc, curr) => {
      const t = new Date(curr.checkInTime);
      return acc + t.getHours() + (t.getMinutes() / 60);
    }, 0) / (recentAttendances.length || 1);

    // Update attendance record with awarded points
    await Attendance.findByIdAndUpdate(attendance._id, { pointsAwarded: attendancePoints });

    // Step 6: Update member
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckIn: checkInTime,
        averageCheckInHour: avgHour,
        $inc: { totalPoints },
      },
      { new: true },
    ).select('-password -refreshToken');

    // Step 7: Create PointsHistory
    await PointsHistory.create({
      member: memberId,
      gym: gymId,
      points: attendancePoints,
      type: 'attendance',
      description: `Check-in on ${today.toLocaleDateString('en-IN')}`,
      refId: attendance._id,
    });

    if (streakBonusResult.eligible) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: streakBonusResult.points,
        type: 'streak_bonus',
        description: `🔥 ${newStreak}-day streak bonus!`,
        refId: attendance._id,
      });
    }

    // Step 8: Milestone notification
    let message = 'Checked in successfully!';
    if (streakBonusResult.eligible) {
      message = `Checked in! ${newStreak}-day streak bonus earned! 🔥 (+${streakBonusResult.points} pts)`;
      await Notification.create({
        member: memberId,
        gym: gymId,
        title: `🔥 ${newStreak}-Day Streak!`,
        message: `Amazing! You hit a ${newStreak}-day streak and earned ${streakBonusResult.points} bonus points!`,
        type: 'streak_alert',
      });
    }

    // Step 9: Badge check
    await checkAndAwardBadges(
      member,
      { currentStreak: newStreak, totalPoints: updatedMember.totalPoints },
      gymId,
    );

    return successResponse(res, message, {
      checkedInAt: checkInTime,
      pointsEarned: attendancePoints,
      streakBonus: streakBonusResult.eligible ? streakBonusResult.points : 0,
      totalPointsEarned: totalPoints,
      currentStreak: newStreak,
      longestStreak: newLongest,
      memberTotalPoints: updatedMember.totalPoints,
    }, 201);
  } catch (error) {
    next(error);
  }
};

// ─── POST /checkout ───────────────────────────────────────────────────────────
const checkOut = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const gymId = req.member.gym;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ member: memberId, date: today });

    if (!attendance) {
      return errorResponse(res, 'You have not checked in today', null, 400);
    }
    if (attendance.checkOutTime) {
      return errorResponse(res, 'Already checked out today', null, 400);
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(attendance.checkInTime);
    
    // Calculate duration in minutes
    const durationMs = checkOutTime - checkInTime;
    const durationMinutes = Math.floor(durationMs / 60000);

    // Safeguard: Forgotten checkout (e.g. > 6 hours = 360 mins)
    // Safeguard: Cap maximum points per day to 24 (2 hours)
    let durationPoints = 0;
    if (durationMinutes > 0 && durationMinutes <= 360) {
      // 1 point per 5 minutes spent
      const rawPoints = Math.floor(durationMinutes / 5);
      durationPoints = Math.min(Math.max(0, rawPoints), 24); // Cap at 24 points, min 0
    }

    // Update Attendance
    attendance.checkOutTime = checkOutTime;
    attendance.pointsAwarded += durationPoints;
    await attendance.save();

    // Update Member total points
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $inc: { totalPoints: durationPoints } },
      { new: true }
    );

    // Record Points History if points earned
    if (durationPoints > 0) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: durationPoints,
        type: 'checkout_duration',
        description: `Spent ${durationMinutes} mins at the gym`,
        refId: attendance._id,
      });
    }

    return successResponse(res, 'Checked out successfully', {
      checkOutTime,
      durationMinutes,
      pointsEarned: durationPoints,
      memberTotalPoints: updatedMember.totalPoints,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET / ─────────────────────────────────────────────────────────────────────
const getAttendance = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const { month } = req.query;

    let year, m;
    if (month) {
      [year, m] = month.split('-').map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      m = now.getMonth() + 1;
    }

    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    const totalDaysInMonth = new Date(year, m, 0).getDate();

    const records = await Attendance.find({
      member: memberId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    // Build calendar data
    const presentDates = new Set(
      records.map((r) => new Date(r.date).getDate()),
    );

    const calendarData = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, m - 1, day);
      const isPast = date <= new Date();
      calendarData.push({
        date: `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        status: !isPast ? 'future' : presentDates.has(day) ? 'present' : 'absent',
      });
    }

    const presentDays = records.length;
    const absentDays = calendarData.filter((d) => d.status === 'absent').length;
    const attendancePercent = Math.round((presentDays / (presentDays + absentDays || 1)) * 100);

    const monthLabel = start.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    return successResponse(res, 'Attendance fetched', {
      month: monthLabel,
      totalDays: totalDaysInMonth,
      presentDays,
      absentDays,
      currentStreak: req.member.currentStreak,
      longestStreak: req.member.longestStreak,
      attendancePercent,
      records: records.map((r) => ({
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        pointsAwarded: r.pointsAwarded,
        markedBy: r.markedBy,
      })),
      calendarData,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /streak ──────────────────────────────────────────────────────────────
const getStreak = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.findOne({ member: req.member._id, date: today });

    return successResponse(res, 'Streak info fetched', {
      currentStreak: req.member.currentStreak,
      longestStreak: req.member.longestStreak,
      lastCheckIn: req.member.lastCheckIn,
      checkedInToday: !!todayAttendance,
      checkInTime: todayAttendance?.checkInTime || null,
      checkOutTime: todayAttendance?.checkOutTime || null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, getAttendance, getStreak };
