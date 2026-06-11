const express = require('express');
const { addTrainer, getTrainers, getTrainer, updateTrainer, deleteTrainer } = require('../controllers/trainer.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createTrainerSchema, updateTrainerSchema } = require('../validators/trainer.validator');
const { uploadSingle } = require('../middleware/upload.middleware');

// Merged router — mounted at /api/gyms/:gymId/trainers
const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', uploadSingle('profilePhoto'), validate(createTrainerSchema), addTrainer);
router.get('/', getTrainers);
router.get('/:trainerId', getTrainer);
router.put('/:trainerId', uploadSingle('profilePhoto'), validate(updateTrainerSchema), updateTrainer);
router.delete('/:trainerId', deleteTrainer);

module.exports = router;
