const express = require('express');
const { checkIn, checkOut, getAttendance, getStreak } = require('../../controllers/member/memberAttendance.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

// ─── SECURITY NOTE (M-1) ──────────────────────────────────────────────────────
// verifyMemberGym is NOT used here because these routes do not accept a :gymId
// in the URL. They rely implicitly on `req.member.gym` attached by `protectMember`.
// If a URL parameter is ever added that specifies a gym or another member's resource,
// you MUST add tenant verification to prevent IDOR.
// ──────────────────────────────────────────────────────────────────────────────

router.use(protectMember);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/', getAttendance);
router.get('/streak', getStreak);

module.exports = router;
