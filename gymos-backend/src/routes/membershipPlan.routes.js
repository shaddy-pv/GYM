const express = require('express');
const { createPlan, getPlans, getPlan, updatePlan, deletePlan } = require('../controllers/membershipPlan.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createMembershipPlanSchema, updateMembershipPlanSchema } = require('../validators/plan.validator');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', validate(createMembershipPlanSchema), createPlan);
router.get('/', getPlans);
router.get('/:planId', getPlan);
router.put('/:planId', validate(updateMembershipPlanSchema), updatePlan);
router.delete('/:planId', deletePlan);

module.exports = router;
