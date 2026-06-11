const express = require('express');
const { getPointsSummary, getPointsHistory, getBadges } = require('../../controllers/member/memberPoints.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

router.get('/', getPointsSummary);
router.get('/history', getPointsHistory);
router.get('/badges', getBadges);

module.exports = router;
