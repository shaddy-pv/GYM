const Subscription = require('../models/Subscription.model');
const { errorResponse } = require('../utils/ApiResponse');

/**
 * Middleware to ensure the owner's subscription allows a specific feature.
 * Assumes req.owner is populated.
 *
 * @param {string} featureName - The feature key from subscription.features
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.owner || !req.owner._id) {
        return errorResponse(res, 'Unauthorized owner access', null, 401);
      }

      const subscription = await Subscription.findOne({ owner: req.owner._id });
      if (!subscription) {
        return errorResponse(res, 'No subscription found for this account', null, 403);
      }

      if (!subscription.isFeatureAllowed(featureName)) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a higher plan. Please upgrade your subscription.`,
          requiredFeature: featureName,
          currentPlan: subscription.plan,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireFeature };
