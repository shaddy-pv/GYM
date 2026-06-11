const Owner = require('../models/Owner.model');
const Subscription = require('../models/Subscription.model');
const Gym = require('../models/Gym.model');
const Member = require('../models/Member.model');
const Payment = require('../models/Payment.model');
const { uploadToCloudinary } = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// ─── Get Profile ─────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.owner._id).populate('subscription');
    return successResponse(res, 'Profile fetched', owner);
  } catch (error) {
    next(error);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    // Handle profile photo upload
    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/owners');
      updateData.profilePhoto = url;
    }

    const owner = await Owner.findByIdAndUpdate(req.owner._id, updateData, {
      new: true,
      runValidators: true,
    }).populate('subscription');

    return successResponse(res, 'Profile updated', owner);
  } catch (error) {
    next(error);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const owner = await Owner.findById(req.owner._id).select('+password');
    const isMatch = await owner.comparePassword(currentPassword);

    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', null, 400);
    }

    owner.password = newPassword; // hashed in pre-save
    owner.refreshToken = null; // invalidate all sessions
    await owner.save();

    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Get Subscription ─────────────────────────────────────────────────────────
const getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ owner: req.owner._id });
    if (!subscription) {
      return errorResponse(res, 'No subscription found', null, 404);
    }
    return successResponse(res, 'Subscription fetched', subscription);
  } catch (error) {
    next(error);
  }
};

// ─── Platform-Level Dashboard Stats ──────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const ownerId = req.owner._id;

    const [totalGyms, totalMembers, totalRevenue] = await Promise.all([
      Gym.countDocuments({ owner: ownerId }),
      Member.countDocuments({ owner: ownerId }),
      Payment.aggregate([
        { $match: { owner: ownerId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const activeMembers = await Member.countDocuments({ owner: ownerId, status: 'active' });
    const expiredMembers = await Member.countDocuments({ owner: ownerId, status: 'expired' });

    return successResponse(res, 'Platform stats fetched', {
      totalGyms,
      totalMembers,
      activeMembers,
      expiredMembers,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword, getSubscription, getDashboardStats };
