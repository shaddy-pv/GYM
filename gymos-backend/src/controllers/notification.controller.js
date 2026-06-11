const Notification = require('../models/Notification.model');
const Member = require('../models/Member.model');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const { sendEmail } = require('../utils/sendEmail');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../utils/ApiResponse');

// ─── Send Manual Notification ─────────────────────────────────────────────────
const sendNotification = async (req, res, next) => {
  try {
    const { memberId, title, message, type, sendWhatsApp: doWhatsApp, sendEmail: doEmail } = req.body;
    const gymId = req.params.gymId;

    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) return errorResponse(res, 'Member not found', null, 404);

    let sentViaWhatsApp = false;
    let sentViaEmail = false;

    // Send WhatsApp
    if (doWhatsApp && member.notifyWhatsApp) {
      const result = await sendWhatsApp(member.phone, `*${title}*\n\n${message}`);
      sentViaWhatsApp = result.success;
    }

    // Send email
    if (doEmail && member.notifyEmail && member.email) {
      const result = await sendEmail({
        to: member.email,
        subject: title,
        html: `<p>${message}</p>`,
      });
      sentViaEmail = result.success;
    }

    // Create notification record
    const notification = await Notification.create({
      member: memberId,
      gym: gymId,
      title,
      message,
      type: type || 'general',
      sentViaWhatsApp,
      sentViaEmail,
    });

    return successResponse(res, 'Notification sent', notification, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get Notifications ────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { memberId, type, page = 1, limit = 20 } = req.query;
    const filter = { gym: req.params.gymId };

    if (memberId) filter.member = memberId;
    if (type) filter.type = type;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('member', 'name memberId phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
    ]);

    return paginatedResponse(res, 'Notifications fetched', notifications, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

// ─── Delete Notification ──────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.notifId,
      gym: req.params.gymId,
    });
    if (!notif) return errorResponse(res, 'Notification not found', null, 404);
    return successResponse(res, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Mark as Read (for member app) ───────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const memberId = req.member?._id;
    await Notification.updateMany({ member: memberId, isRead: false }, { isRead: true });
    return successResponse(res, 'Notifications marked as read');
  } catch (error) {
    next(error);
  }
};

// ─── Get Member's Own Notifications ──────────────────────────────────────────
const getMyNotifications = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find({ member: memberId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments({ member: memberId }),
    ]);

    return paginatedResponse(res, 'My notifications', notifications, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

// ─── Admin App Notifications (for Gym Owners) ──────────────────────────────────
const getAdminNotifications = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const filter = { gym: gymId, targetRole: 'admin' };
    if (unreadOnly === 'true') filter.isRead = false;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('member', 'name profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({ gym: gymId, targetRole: 'admin', isRead: false }),
    ]);

    return paginatedResponse(res, 'Admin notifications fetched', { unreadCount, notifications }, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

const markAdminAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.notifId, gym: req.params.gymId, targetRole: 'admin' },
      { isRead: true },
      { new: true }
    );
    if (!notif) return errorResponse(res, 'Notification not found', null, 404);
    return successResponse(res, 'Notification marked as read', notif);
  } catch (error) {
    next(error);
  }
};

const markAllAdminAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { gym: req.params.gymId, targetRole: 'admin', isRead: false },
      { isRead: true }
    );
    return successResponse(res, `${result.modifiedCount} notifications marked as read`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  deleteNotification,
  markAsRead,
  getMyNotifications,
  getAdminNotifications,
  markAdminAsRead,
  markAllAdminAsRead,
};
