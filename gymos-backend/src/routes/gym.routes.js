const express = require('express');
const { createGym, getGyms, getGym, updateGym, deleteGym, updatePointsConfig, getGymDashboard } = require('../controllers/gym.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createGymSchema, updateGymSchema, pointsConfigSchema } = require('../validators/gym.validator');
const multer = require('multer');

const router = express.Router();

// All gym routes require owner auth
router.use(protect);

router.post('/', validate(createGymSchema), createGym);
router.get('/', getGyms);

// Routes with :gymId require tenant verification
router.get('/:gymId', verifyGymOwnership, getGym);
router.put('/:gymId', verifyGymOwnership, validate(updateGymSchema), updateGym);
router.delete('/:gymId', verifyGymOwnership, deleteGym);
router.put('/:gymId/points-config', verifyGymOwnership, validate(pointsConfigSchema), updatePointsConfig);
router.get('/:gymId/dashboard', verifyGymOwnership, getGymDashboard);

module.exports = router;
