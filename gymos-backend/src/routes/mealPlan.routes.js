const express = require('express');
const { createMealPlan, getMealPlans, getMealPlan, updateMealPlan, deleteMealPlan } = require('../controllers/mealPlan.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createMealPlanSchema, updateMealPlanSchema } = require('../validators/plan.validator');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', validate(createMealPlanSchema), createMealPlan);
router.get('/', getMealPlans);
router.get('/:planId', getMealPlan);
router.put('/:planId', validate(updateMealPlanSchema), updateMealPlan);
router.delete('/:planId', deleteMealPlan);

module.exports = router;
