const express = require('express');
const { checkIn, checkOut, getAttendance, getStreak } = require('../../controllers/member/memberAttendance.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/', getAttendance);
router.get('/streak', getStreak);

module.exports = router;
