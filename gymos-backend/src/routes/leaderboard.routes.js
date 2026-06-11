const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboard.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.get('/', getLeaderboard);

module.exports = router;
