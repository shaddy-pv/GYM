const Gym = require('../models/Gym.model');
const Member = require('../models/Member.model');
const Payment = require('../models/Payment.model');
const Attendance = require('../models/Attendance.model');
const Subscription = require('../models/Subscription.model');
const { uploadToCloudinary } = require('../config/cloudinary');
const { auditLog } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// ─── Create Gym ───────────────────────────────────────────────────────────────
const createGym = async (req, res, next) => {
  try {
    // Check subscription gym limit
    const subscription = await Subscription.findOne({ owner: req.owner._id });
    if (subscription) {
      const gymCount = await Gym.countDocuments({ owner: req.owner._id });
      if (subscription.maxGyms !== null && gymCount >= subscription.maxGyms) {
        return errorResponse(
          res,
          `Your ${subscription.plan} plan allows a maximum of ${subscription.maxGyms} gym(s). Upgrade to add more.`,
          null,
          403,
        );
      }
    }

    const gym = await Gym.create({ ...req.body, owner: req.owner._id });
    return successResponse(res, 'Gym created successfully', gym, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get All Gyms (owner's) ───────────────────────────────────────────────────
const getGyms = async (req, res, next) => {
  try {
    const gyms = await Gym.find({ owner: req.owner._id }).sort({ createdAt: -1 });
    return successResponse(res, 'Gyms fetched', gyms);
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Gym ───────────────────────────────────────────────────────────
const getGym = async (req, res, next) => {
  try {
    // req.gym already attached by tenant middleware
    return successResponse(res, 'Gym fetched', req.gym);
  } catch (error) {
    next(error);
  }
};

// ─── Update Gym ───────────────────────────────────────────────────────────────
const updateGym = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (req.files?.logo) {
      const { url } = await uploadToCloudinary(req.files.logo[0].buffer, 'gymos/gyms/logos');
      updateData.logo = url;
    }
    if (req.files?.coverPhoto) {
      const { url } = await uploadToCloudinary(req.files.coverPhoto[0].buffer, 'gymos/gyms/covers');
      updateData.coverPhoto = url;
    }

    const gym = await Gym.findByIdAndUpdate(req.params.gymId, updateData, {
      new: true,
      runValidators: true,
    });

    await auditLog({
      req,
      gymId: gym._id,
      action: 'UPDATE_GYM',
      targetModel: 'Gym',
      targetId: gym._id,
      details: { updateData },
    });

    return successResponse(res, 'Gym updated', gym);
  } catch (error) {
    next(error);
  }
};

// ─── Delete Gym ───────────────────────────────────────────────────────────────
const deleteGym = async (req, res, next) => {
  try {
    const memberCount = await Member.countDocuments({ gym: req.params.gymId });
    if (memberCount > 0) {
      return errorResponse(
        res,
        `Cannot delete gym with ${memberCount} active member(s). Deactivate all members first.`,
        null,
        400,
      );
    }

    await Gym.findByIdAndDelete(req.params.gymId);

    await auditLog({
      req,
      gymId: req.params.gymId,
      action: 'DELETE_GYM',
      targetModel: 'Gym',
      targetId: req.params.gymId,
    });

    return successResponse(res, 'Gym deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Update Points Config ─────────────────────────────────────────────────────
const updatePointsConfig = async (req, res, next) => {
  try {
    const gym = await Gym.findByIdAndUpdate(
      req.params.gymId,
      { pointsConfig: req.body },
      { new: true, runValidators: true },
    );

    await auditLog({
      req,
      gymId: gym._id,
      action: 'UPDATE_POINTS_CONFIG',
      targetModel: 'Gym',
      targetId: gym._id,
      details: { newConfig: req.body },
    });

    return successResponse(res, 'Points configuration updated successfully', gym);
  } catch (error) {
    next(error);
  }
};

const mongoose = require('mongoose');

// ─── Gym Dashboard Stats ──────────────────────────────────────────────────────
const getGymDashboard = async (req, res, next) => {
  try {
    const gymId = new mongoose.Types.ObjectId(req.params.gymId);

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      expiringThisWeek,
      todayAttendanceCount,
      revenueThisMonth,
      pendingDues,
      recentMembers,
      expiringMembers,
    ] = await Promise.all([
      Member.countDocuments({ gym: gymId }),
      Member.countDocuments({ gym: gymId, status: 'active' }),
      Member.countDocuments({ gym: gymId, status: 'expired' }),
      Member.countDocuments({ gym: gymId, status: 'active', expiryDate: { $lte: weekFromNow, $gte: now } }),
      Attendance.countDocuments({ gym: gymId, date: { $gte: todayStart } }),
      // Revenue This Month: sum of all transactions paid this month (accurate regardless of when invoice was created)
      Payment.aggregate([
        { $match: { gym: gymId } },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: false } },
        { $match: { 'transactions.paidAt': { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$transactions.amount' } } },
      ]),
      // Pending Dues: total outstanding balance across pending, partially_paid, and overdue invoices
      Payment.aggregate([
        { $match: { gym: gymId, status: { $in: ['pending', 'partially_paid', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
      ]),
      Member.find({ gym: gymId }).sort({ createdAt: -1 }).limit(5).select('name memberId status joinDate profilePhoto'),
      Member.find({ gym: gymId, status: 'active', expiryDate: { $lte: weekFromNow, $gte: now } })
        .sort({ expiryDate: 1 })
        .limit(10)
        .select('name memberId phone expiryDate'),
    ]);

    // Last 6 months revenue
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      last6Months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        start: d,
        end: dEnd,
      });
    }

    const monthlyRevenue = await Promise.all(
      last6Months.map(async ({ month, year, start, end }) => {
        const result = await Payment.aggregate([
          { $match: { gym: gymId } },
          { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: false } },
          { $match: { 'transactions.paidAt': { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$transactions.amount' } } },
        ]);
        // Fallback: if no transactions (old records), count direct paid invoices created in that month
        let revenue = result[0]?.total || 0;
        if (revenue === 0) {
          const fallback = await Payment.aggregate([
            { $match: { gym: gymId, status: 'paid', createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);
          revenue = fallback[0]?.total || 0;
        }
        return { month, year, revenue };
      }),
    );

    return successResponse(res, 'Gym dashboard stats fetched', {
      totalMembers,
      activeMembers,
      expiredMembers,
      expiringThisWeek,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      pendingDues: pendingDues[0]?.total || 0,
      todayAttendance: todayAttendanceCount,
      recentMembers,
      expiringMembers,
      monthlyRevenue,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createGym, getGyms, getGym, updateGym, deleteGym, updatePointsConfig, getGymDashboard };
