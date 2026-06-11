const Gym = require('../models/Gym.model');
const { errorResponse } = require('../utils/ApiResponse');

/**
 * CRITICAL tenant isolation middleware.
 * Verifies that the gym in :gymId belongs to the authenticated owner.
 * Attaches req.gym to the request.
 *
 * Must be used AFTER protect middleware.
 */
const verifyGymOwnership = async (req, res, next) => {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      return errorResponse(res, 'Gym ID is required', null, 400);
    }

    const gym = await Gym.findById(gymId);

    if (!gym) {
      return errorResponse(res, 'Gym not found', null, 404);
    }

    // CRITICAL: Cross-tenant access prevention
    if (gym.owner.toString() !== req.owner._id.toString()) {
      return errorResponse(
        res,
        'Forbidden — you do not have access to this gym',
        null,
        403,
      );
    }

    req.gym = gym;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Member-scoped gym access.
 * Verifies the gym belongs to the member's gym.
 */
const verifyMemberGym = async (req, res, next) => {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      return errorResponse(res, 'Gym ID is required', null, 400);
    }

    // Member can only access their own gym
    if (req.member.gym.toString() !== gymId) {
      return errorResponse(
        res,
        'Forbidden — you can only access your own gym data',
        null,
        403,
      );
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return errorResponse(res, 'Gym not found', null, 404);
    }

    req.gym = gym;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyGymOwnership, verifyMemberGym };
