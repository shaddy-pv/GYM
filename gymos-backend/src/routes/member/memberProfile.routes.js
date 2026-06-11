const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../../controllers/member/memberProfile.controller');
const { protectMember } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { updateMemberProfileSchema, changeMemberPasswordSchema } = require('../../validators/member/member.validators');
const { uploadSingle } = require('../../middleware/upload.middleware');

const router = express.Router();

// All routes require member auth
router.use(protectMember);

router.get('/', getProfile);
router.put('/', uploadSingle('profilePhoto'), validate(updateMemberProfileSchema), updateProfile);
router.put('/change-password', validate(changeMemberPasswordSchema), changePassword);

module.exports = router;
