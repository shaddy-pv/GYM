const bcrypt = require('bcrypt');
const Member = require('../../models/Member.model');
const Attendance = require('../../models/Attendance.model');
const WorkoutLog = require('../../models/WorkoutLog.model');
const PointsHistory = require('../../models/PointsHistory.model');
const { uploadToCloudinary } = require('../../config/cloudinary');
const { successResponse, errorResponse } = require('../../utils/ApiResponse');

// ─── Get Profile ─────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const member = await Member.findById(req.member._id)
      .select('-password -refreshToken')
      .populate('gym', 'name logo timings phone email address pointsConfig')
      .populate('trainer', 'name specialization phone profilePhoto experience')
      .populate('membershipPlan', 'name durationDays price features')
      .populate('exercisePlan', 'name goal daysPerWeek')
      .populate('mealPlan', 'name goal totalCalories macros');

    if (!member) return errorResponse(res, 'Member not found', null, 404);

    // ─── Computed Fields ────────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(member.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);

    const daysRemaining = Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)));

    let membershipStatus = 'active';
    if (daysRemaining === 0) membershipStatus = 'expired';
    else if (daysRemaining <= 7) membershipStatus = 'expiring';

    // Attendance this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [attendanceThisMonth, workoutsThisMonth, pointsThisMonthResult] = await Promise.all([
      Attendance.countDocuments({ member: member._id, date: { $gte: monthStart, $lte: monthEnd } }),
      WorkoutLog.countDocuments({
        member: member._id,
        date: { $gte: monthStart, $lte: monthEnd },
        completedCount: { $gt: 0 },
      }),
      PointsHistory.aggregate([
        { $match: { member: member._id, createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
    ]);

    const pointsThisMonth = pointsThisMonthResult[0]?.total || 0;

    return successResponse(res, 'Profile fetched', {
      ...member.toJSON(),
      daysRemaining,
      membershipStatus,
      attendanceThisMonth,
      workoutsThisMonth,
      pointsThisMonth,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    // Only allow safe fields — never touch protected fields
    const ALLOWED_FIELDS = ['name', 'email', 'height', 'weight', 'emergencyContact', 'notifyWhatsApp', 'notifyEmail'];
    const updateData = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle profile photo upload
    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/members');
      updateData.profilePhoto = url;
    }

    const updated = await Member.findByIdAndUpdate(req.member._id, updateData, {
      new: true,
      runValidators: true,
    })
      .select('-password -refreshToken')
      .populate('gym', 'name logo')
      .populate('membershipPlan', 'name durationDays price');

    return successResponse(res, 'Profile updated', updated);
  } catch (error) {
    next(error);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const member = await Member.findById(req.member._id).select('+password');
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    const isMatch = await member.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', null, 400);
    }

    member.password = newPassword; // hashed in pre-save hook
    member.refreshToken = null; // invalidate existing sessions
    await member.save();

    return successResponse(res, 'Password changed successfully. Please login again.');
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword };
