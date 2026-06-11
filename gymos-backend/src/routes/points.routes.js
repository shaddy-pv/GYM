const express = require('express');
const { getPointsHistory, awardPoints, deductPoints } = require('../controllers/points.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.get('/member/:memberId', getPointsHistory);
router.post('/award', awardPoints);
router.post('/deduct', deductPoints);

module.exports = router;
