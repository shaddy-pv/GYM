const express = require('express');
const { getTodayWorkout, getWeekWorkout, completeExercise, getWorkoutHistory } = require('../../controllers/member/memberWorkout.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

router.get('/today', getTodayWorkout);
router.get('/week', getWeekWorkout);
router.get('/history', getWorkoutHistory);
router.post('/complete/:exerciseIndex', completeExercise);

module.exports = router;
