const Trainer = require('../models/Trainer.model');
const { uploadToCloudinary } = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// ─── Add Trainer ──────────────────────────────────────────────────────────────
const addTrainer = async (req, res, next) => {
  try {
    const gymId = req.params.gymId;

    const existing = await Trainer.findOne({ gym: gymId, phone: req.body.phone });
    if (existing) {
      return errorResponse(res, 'A trainer with this phone number already exists in this gym', null, 409);
    }

    const trainerData = { ...req.body, gym: gymId, owner: req.owner._id };

    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/trainers');
      trainerData.profilePhoto = url;
    }

    const trainer = await Trainer.create(trainerData);
    return successResponse(res, 'Trainer added', trainer, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get Trainers ─────────────────────────────────────────────────────────────
const getTrainers = async (req, res, next) => {
  try {
    const trainers = await Trainer.find({ gym: req.params.gymId }).sort({ createdAt: -1 }).lean();
    
    // Calculate assigned members count for each trainer
    const Member = require('../models/Member.model');
    const mongoose = require('mongoose');
    const memberCounts = await Member.aggregate([
      { $match: { gym: new mongoose.Types.ObjectId(req.params.gymId), status: 'active', trainer: { $in: trainers.map(t => t._id) } } },
      { $group: { _id: '$trainer', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    for (const mc of memberCounts) {
      countMap[mc._id.toString()] = mc.count;
    }

    const trainersWithCounts = trainers.map(t => ({
      ...t,
      assignedMembersCount: countMap[t._id.toString()] || 0
    }));

    return successResponse(res, 'Trainers fetched', trainersWithCounts);
  } catch (error) {
    next(error);
  }
};

// ─── Get Trainer ──────────────────────────────────────────────────────────────
const getTrainer = async (req, res, next) => {
  try {
    const trainer = await Trainer.findOne({ _id: req.params.trainerId, gym: req.params.gymId });
    if (!trainer) return errorResponse(res, 'Trainer not found', null, 404);
    return successResponse(res, 'Trainer fetched', trainer);
  } catch (error) {
    next(error);
  }
};

// ─── Update Trainer ───────────────────────────────────────────────────────────
const updateTrainer = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      const { url } = await uploadToCloudinary(req.file.buffer, 'gymos/trainers');
      updateData.profilePhoto = url;
    }

    const trainer = await Trainer.findOneAndUpdate(
      { _id: req.params.trainerId, gym: req.params.gymId },
      updateData,
      { new: true, runValidators: true },
    );

    if (!trainer) return errorResponse(res, 'Trainer not found', null, 404);
    return successResponse(res, 'Trainer updated', trainer);
  } catch (error) {
    next(error);
  }
};

// ─── Delete Trainer ───────────────────────────────────────────────────────────
const deleteTrainer = async (req, res, next) => {
  try {
    const trainer = await Trainer.findOneAndDelete({ _id: req.params.trainerId, gym: req.params.gymId });
    if (!trainer) return errorResponse(res, 'Trainer not found', null, 404);
    return successResponse(res, 'Trainer removed');
  } catch (error) {
    next(error);
  }
};

module.exports = { addTrainer, getTrainers, getTrainer, updateTrainer, deleteTrainer };
