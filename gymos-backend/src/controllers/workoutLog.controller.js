const WorkoutLog = require('../models/WorkoutLog.model');
const Member = require('../models/Member.model');
const ExercisePlan = require('../models/ExercisePlan.model');
const PointsHistory = require('../models/PointsHistory.model');
const { calcExercisePoints, calcFullWorkoutBonus, evaluateBadges } = require('../utils/calculatePoints');
const { successResponse, errorResponse } = require('../utils/ApiResponse');

// ─── Complete an Exercise ─────────────────────────────────────────────────────
const completeExercise = async (req, res, next) => {
  try {
    const { exerciseId, exercisePlanId } = req.body;
    const memberId = req.member?._id || req.body.memberId;
    const gymId = req.params.gymId;

    // Get today's date (normalized)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Step 1: Get exercise plan
    const plan = await ExercisePlan.findOne({ _id: exercisePlanId, gym: gymId });
    if (!plan) return errorResponse(res, 'Exercise plan not found', null, 404);

    // Find today's schedule
    const todaySchedule = plan.schedule.find((s) => s.day === dayName);
    if (!todaySchedule || todaySchedule.isRestDay) {
      return errorResponse(res, 'No exercises scheduled for today (rest day or no schedule)', null, 400);
    }

    // Find the specific exercise
    const exercise = todaySchedule.exercises.find((e) => e._id.toString() === exerciseId);
    if (!exercise) return errorResponse(res, 'Exercise not found in today\'s schedule', null, 404);

    // Step 2: Get or create today's workout log
    let workoutLog = await WorkoutLog.findOne({ member: memberId, date: today });
    if (!workoutLog) {
      workoutLog = await WorkoutLog.create({
        member: memberId,
        gym: gymId,
        exercisePlan: exercisePlanId,
        date: today,
        day: dayName,
        totalExercises: todaySchedule.exercises.length,
        completedExercises: [],
      });
    }

    // Step 3: Check exercise not already completed
    const alreadyDone = workoutLog.completedExercises.some((e) => e.exerciseName === exercise.name);
    if (alreadyDone) {
      return errorResponse(res, 'Exercise already completed today', null, 409);
    }

    // Step 4: Calculate points
    const exercisePoints = calcExercisePoints(exercise.pointsValue);

    // Step 5: Add to completed
    workoutLog.completedExercises.push({
      exerciseName: exercise.name,
      pointsEarned: exercisePoints,
      completedAt: new Date(),
    });
    workoutLog.completedCount += 1;
    workoutLog.totalPointsEarned += exercisePoints;

    // Step 6: Check if fully completed
    let bonusPoints = 0;
    if (workoutLog.completedCount >= workoutLog.totalExercises && !workoutLog.bonusPointsAwarded) {
      workoutLog.isFullyCompleted = true;
      workoutLog.bonusPointsAwarded = true;
      const gym = await require('../models/Gym.model').findById(gymId);
      bonusPoints = calcFullWorkoutBonus(gym.pointsConfig);
      workoutLog.totalPointsEarned += bonusPoints;
    }

    await workoutLog.save();

    // Step 7: Update member points
    const totalPointsToAdd = exercisePoints + bonusPoints;
    const member = await Member.findById(memberId);

    const updatedMemberData = { $inc: { totalPoints: totalPointsToAdd } };
    const tempMember = { ...member.toObject(), totalPoints: member.totalPoints + totalPointsToAdd };
    const newBadges = evaluateBadges(tempMember);
    if (newBadges.length > 0) {
      updatedMemberData.$addToSet = { badges: { $each: newBadges } };
    }

    await Member.findByIdAndUpdate(memberId, updatedMemberData);

    // Step 8: Create PointsHistory
    await PointsHistory.create({
      member: memberId,
      gym: gymId,
      points: exercisePoints,
      type: 'exercise_complete',
      description: `Completed: ${exercise.name}`,
      refId: workoutLog._id,
    });

    if (bonusPoints > 0) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: bonusPoints,
        type: 'full_workout_bonus',
        description: 'Full workout completed!',
        refId: workoutLog._id,
      });
    }

    return successResponse(res, 'Exercise completed!', {
      workoutLog,
      pointsEarned: exercisePoints,
      bonusPoints,
      isFullyCompleted: workoutLog.isFullyCompleted,
      newBadges,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Today's Log ──────────────────────────────────────────────────────────
const getTodayLog = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memberId = req.member?._id || req.params.memberId;
    const log = await WorkoutLog.findOne({ member: memberId, date: today }).populate('exercisePlan');

    return successResponse(res, "Today's workout log", log || null);
  } catch (error) {
    next(error);
  }
};

// ─── Workout History ──────────────────────────────────────────────────────────
const getWorkoutHistory = async (req, res, next) => {
  try {
    const memberId = req.member?._id || req.params.memberId;
    const { limit = 30 } = req.query;

    const logs = await WorkoutLog.find({ member: memberId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate('exercisePlan', 'name goal');

    return successResponse(res, 'Workout history fetched', logs);
  } catch (error) {
    next(error);
  }
};

module.exports = { completeExercise, getTodayLog, getWorkoutHistory };
