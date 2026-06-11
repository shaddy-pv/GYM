const express = require('express');
const { getLeaderboard } = require('../../controllers/member/memberLeaderboard.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

// GET /?period=week|month|all
router.get('/', getLeaderboard);

module.exports = router;
