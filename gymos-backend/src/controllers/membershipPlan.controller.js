const MembershipPlan = require('../models/MembershipPlan.model');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

const createPlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.create({
      ...req.body,
      gym: req.params.gymId,
      owner: req.owner._id,
    });
    return successResponse(res, 'Membership plan created', plan, 201);
  } catch (error) {
    next(error);
  }
};

const getPlans = async (req, res, next) => {
  try {
    const filter = { gym: req.params.gymId };
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
    const plans = await MembershipPlan.find(filter).sort({ price: 1 });
    return successResponse(res, 'Plans fetched', plans);
  } catch (error) {
    next(error);
  }
};

const getPlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findOne({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Plan not found', null, 404);
    return successResponse(res, 'Plan fetched', plan);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findOneAndUpdate(
      { _id: req.params.planId, gym: req.params.gymId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!plan) return errorResponse(res, 'Plan not found', null, 404);
    return successResponse(res, 'Plan updated', plan);
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findOneAndDelete({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Plan not found', null, 404);
    return successResponse(res, 'Plan deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { createPlan, getPlans, getPlan, updatePlan, deletePlan };
