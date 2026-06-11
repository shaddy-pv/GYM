const express = require('express');
const { completeExercise, getTodayLog, getWorkoutHistory } = require('../controllers/workoutLog.controller');
const { protect, protectMember } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');

const router = express.Router({ mergeParams: true });

// Owner can view members' workout logs (gym-scoped)
router.get('/member/:memberId/today', protect, verifyGymOwnership, getTodayLog);
router.get('/member/:memberId/history', protect, verifyGymOwnership, getWorkoutHistory);

// Member can complete exercises and view their own log
router.post('/complete', protectMember, completeExercise);
router.get('/my/today', protectMember, getTodayLog);
router.get('/my/history', protectMember, getWorkoutHistory);

module.exports = router;
