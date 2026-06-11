const express = require('express');
const {
  createMember, getMembers, getMember, updateMember, deleteMember,
  assignTrainer, assignExercisePlan, assignMealPlan,
  suspendMember, activateMember, getMemberStats, resetPassword
} = require('../controllers/member.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createMemberSchema, updateMemberSchema } = require('../validators/member.validator');
const { uploadSingle } = require('../middleware/upload.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', uploadSingle('profilePhoto'), validate(createMemberSchema), createMember);
router.get('/', getMembers);
router.get('/:memberId', getMember);
router.put('/:memberId', uploadSingle('profilePhoto'), validate(updateMemberSchema), updateMember);
router.delete('/:memberId', deleteMember);

// Action routes
router.put('/:memberId/assign-trainer', assignTrainer);
router.put('/:memberId/assign-exercise-plan', assignExercisePlan);
router.put('/:memberId/assign-meal-plan', assignMealPlan);
router.put('/:memberId/suspend', suspendMember);
router.put('/:memberId/activate', activateMember);
router.post('/:memberId/reset-password', resetPassword);
router.get('/:memberId/stats', getMemberStats);

module.exports = router;
