const express = require('express');
const { getProfile, updateProfile, changePassword, getSubscription, getDashboardStats } = require('../controllers/owner.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

const router = express.Router();

// All owner routes require auth
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', uploadSingle('profilePhoto'), updateProfile);
router.put('/change-password', changePassword);
router.get('/subscription', getSubscription);
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;
