const express = require('express');
const {
  createExercisePlan, getExercisePlans, getExercisePlan,
  updateExercisePlan, deleteExercisePlan, duplicateExercisePlan,
} = require('../controllers/exercisePlan.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createExercisePlanSchema, updateExercisePlanSchema } = require('../validators/plan.validator');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', validate(createExercisePlanSchema), createExercisePlan);
router.get('/', getExercisePlans);
router.get('/:planId', getExercisePlan);
router.put('/:planId', validate(updateExercisePlanSchema), updateExercisePlan);
router.delete('/:planId', deleteExercisePlan);
router.post('/:planId/duplicate', duplicateExercisePlan);

module.exports = router;
