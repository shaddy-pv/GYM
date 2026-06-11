const Notification = require('../../models/Notification.model');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../../utils/ApiResponse');

// ─── GET / ─────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const memberId = req.member._id;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const filter = { member: memberId };
    if (unreadOnly === 'true') filter.isRead = false;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({ member: memberId, isRead: false }),
    ]);

    return paginatedResponse(
      res,
      'Notifications fetched',
      { unreadCount, notifications },
      buildPagination(total, pageNum, limitNum),
    );
  } catch (error) {
    next(error);
  }
};

// ─── GET /unread-count ────────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ member: req.member._id, isRead: false });
    return successResponse(res, 'Unread count fetched', { count });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /read/:notifId ───────────────────────────────────────────────────────
const markOneAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.notifId,
      member: req.member._id, // strict ownership
    });

    if (!notif) return errorResponse(res, 'Notification not found', null, 404);
    if (notif.isRead) return successResponse(res, 'Already marked as read', notif);

    notif.isRead = true;
    await notif.save();

    return successResponse(res, 'Notification marked as read', notif);
  } catch (error) {
    next(error);
  }
};

// ─── PUT /read-all ────────────────────────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { member: req.member._id, isRead: false },
      { isRead: true },
    );
    return successResponse(res, `${result.modifiedCount} notification(s) marked as read`);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /:notifId ─────────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.notifId,
      member: req.member._id, // strict ownership
    });

    if (!notif) return errorResponse(res, 'Notification not found', null, 404);
    return successResponse(res, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, getUnreadCount, markOneAsRead, markAllAsRead, deleteNotification };
