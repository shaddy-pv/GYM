const MealPlan = require('../models/MealPlan.model');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

const createMealPlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.create({
      ...req.body,
      gym: req.params.gymId,
      owner: req.owner._id,
    });
    return successResponse(res, 'Meal plan created', plan, 201);
  } catch (error) {
    next(error);
  }
};

const getMealPlans = async (req, res, next) => {
  try {
    const filter = { gym: req.params.gymId };
    if (req.query.goal) filter.goal = req.query.goal;
    if (req.query.template !== undefined) filter.isTemplate = req.query.template === 'true';
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

    const plans = await MealPlan.find(filter).sort({ createdAt: -1 });
    return successResponse(res, 'Meal plans fetched', plans);
  } catch (error) {
    next(error);
  }
};

const getMealPlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOne({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Meal plan not found', null, 404);
    return successResponse(res, 'Meal plan fetched', plan);
  } catch (error) {
    next(error);
  }
};

const updateMealPlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOneAndUpdate(
      { _id: req.params.planId, gym: req.params.gymId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!plan) return errorResponse(res, 'Meal plan not found', null, 404);
    return successResponse(res, 'Meal plan updated', plan);
  } catch (error) {
    next(error);
  }
};

const deleteMealPlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOneAndDelete({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Meal plan not found', null, 404);
    return successResponse(res, 'Meal plan deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { createMealPlan, getMealPlans, getMealPlan, updateMealPlan, deleteMealPlan };
