const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../../controllers/member/memberNotification.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/read/:notifId', markOneAsRead);
router.delete('/:notifId', deleteNotification);

module.exports = router;
