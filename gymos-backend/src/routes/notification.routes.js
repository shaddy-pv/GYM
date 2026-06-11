const express = require('express');
const {
  sendNotification, getNotifications, deleteNotification,
  markAsRead, getMyNotifications, getAdminNotifications, markAllAdminAsRead, markAdminAsRead
} = require('../controllers/notification.controller');
const { protect, protectMember } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { sendNotificationSchema } = require('../validators/notification.validator');
const { requireFeature } = require('../middleware/subscription.middleware');

const router = express.Router({ mergeParams: true });

// Owner routes
router.post(
  '/send',
  protect,
  verifyGymOwnership,
  validate(sendNotificationSchema),
  (req, res, next) => {
    if (req.body.sendWhatsApp) {
      return requireFeature('whatsappAlerts')(req, res, next);
    }
    next();
  },
  sendNotification
);
router.get('/', protect, verifyGymOwnership, getNotifications);
router.delete('/:notifId', protect, verifyGymOwnership, deleteNotification);

// Admin Notification Feed
router.get('/admin', protect, verifyGymOwnership, getAdminNotifications);
router.put('/admin/read-all', protect, verifyGymOwnership, markAllAdminAsRead);
router.put('/admin/read/:notifId', protect, verifyGymOwnership, markAdminAsRead);

// Member routes
router.get('/my', protectMember, getMyNotifications);
router.put('/my/read-all', protectMember, markAsRead);

module.exports = router;
