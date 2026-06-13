const express = require('express');
const { getTodayWorkout, getWeekWorkout, completeExercise, getWorkoutHistory } = require('../../controllers/member/memberWorkout.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

// ─── SECURITY NOTE (M-1) ──────────────────────────────────────────────────────
// verifyMemberGym is NOT used here because these routes do not accept a :gymId
// in the URL. They rely implicitly on `req.member.gym` attached by `protectMember`.
// If a URL parameter is ever added that specifies a gym or another member's resource,
// you MUST add tenant verification to prevent IDOR.
// ──────────────────────────────────────────────────────────────────────────────

router.use(protectMember);

router.get('/today', getTodayWorkout);
router.get('/week', getWeekWorkout);
router.get('/history', getWorkoutHistory);
router.post('/complete/:exerciseIndex', completeExercise);

module.exports = router;
