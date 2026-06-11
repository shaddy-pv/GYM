const ExercisePlan = require('../models/ExercisePlan.model');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

const createExercisePlan = async (req, res, next) => {
  try {
    const plan = await ExercisePlan.create({
      ...req.body,
      gym: req.params.gymId,
      owner: req.owner._id,
    });
    return successResponse(res, 'Exercise plan created', plan, 201);
  } catch (error) {
    next(error);
  }
};

const getExercisePlans = async (req, res, next) => {
  try {
    const filter = { gym: req.params.gymId };
    if (req.query.goal) filter.goal = req.query.goal;
    if (req.query.template !== undefined) filter.isTemplate = req.query.template === 'true';
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

    const plans = await ExercisePlan.find(filter).sort({ createdAt: -1 });
    return successResponse(res, 'Exercise plans fetched', plans);
  } catch (error) {
    next(error);
  }
};

const getExercisePlan = async (req, res, next) => {
  try {
    const plan = await ExercisePlan.findOne({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Exercise plan not found', null, 404);
    return successResponse(res, 'Exercise plan fetched', plan);
  } catch (error) {
    next(error);
  }
};

const updateExercisePlan = async (req, res, next) => {
  try {
    const plan = await ExercisePlan.findOneAndUpdate(
      { _id: req.params.planId, gym: req.params.gymId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!plan) return errorResponse(res, 'Exercise plan not found', null, 404);
    return successResponse(res, 'Exercise plan updated', plan);
  } catch (error) {
    next(error);
  }
};

const deleteExercisePlan = async (req, res, next) => {
  try {
    const plan = await ExercisePlan.findOneAndDelete({ _id: req.params.planId, gym: req.params.gymId });
    if (!plan) return errorResponse(res, 'Exercise plan not found', null, 404);
    return successResponse(res, 'Exercise plan deleted');
  } catch (error) {
    next(error);
  }
};

const duplicateExercisePlan = async (req, res, next) => {
  try {
    const original = await ExercisePlan.findOne({ _id: req.params.planId, gym: req.params.gymId });
    if (!original) return errorResponse(res, 'Exercise plan not found', null, 404);

    const { _id, createdAt, updatedAt, __v, ...planData } = original.toObject();
    const duplicate = await ExercisePlan.create({
      ...planData,
      name: `${original.name} (Copy)`,
      isTemplate: false,
    });

    return successResponse(res, 'Exercise plan duplicated', duplicate, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExercisePlan,
  getExercisePlans,
  getExercisePlan,
  updateExercisePlan,
  deleteExercisePlan,
  duplicateExercisePlan,
};
