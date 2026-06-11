const express = require('express');
const {
  markAttendance, getTodayAttendance, getMemberAttendance,
  getMonthlySummary, exportAttendanceCSV,
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/mark', markAttendance);
router.get('/today', getTodayAttendance);
router.get('/summary', getMonthlySummary);
router.get('/export', exportAttendanceCSV);
router.get('/member/:memberId', getMemberAttendance);

module.exports = router;
