const Member = require('../../models/Member.model');
const ExercisePlan = require('../../models/ExercisePlan.model');
const WorkoutLog = require('../../models/WorkoutLog.model');
const PointsHistory = require('../../models/PointsHistory.model');
const Gym = require('../../models/Gym.model');
const { checkAndAwardBadges } = require('../../utils/checkAndAwardBadges');
const { calcExercisePoints, calcFullWorkoutBonus } = require('../../utils/calculatePoints');
const { successResponse, errorResponse, paginatedResponse, buildPagination } = require('../../utils/ApiResponse');

// ─── Helper: normalize date to midnight UTC ────────────────────────────────────
const toMidnightUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Helper: get day name ─────────────────────────────────────────────────────
const getDayName = (d = new Date()) =>
  d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

// ─── Helper: merge plan schedule + workout log ────────────────────────────────
const mergeScheduleWithLog = (daySchedule, workoutLog) => {
  if (!daySchedule) return null;

  const completedMap = new Map(
    (workoutLog?.completedExercises || []).map((e) => [e.exerciseName, e]),
  );

  const exercises = (daySchedule.exercises || []).map((ex) => {
    const logEntry = completedMap.get(ex.name);
    return {
      _id: ex._id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      durationSeconds: ex.durationSeconds,
      restSeconds: ex.restSeconds,
      pointsValue: ex.pointsValue,
      instructions: ex.instructions,
      muscleGroup: ex.muscleGroup,
      demoImageUrl: ex.demoImageUrl,
      isCompleted: !!logEntry,
      completedAt: logEntry?.completedAt || null,
    };
  });

  return {
    day: daySchedule.day,
    isRestDay: daySchedule.isRestDay || false,
    focusArea: daySchedule.focusArea || null,
    exercises,
    totalExercises: exercises.length,
    completedCount: workoutLog?.completedCount || 0,
    isFullyCompleted: workoutLog?.isFullyCompleted || false,
    totalPointsEarned: workoutLog?.totalPointsEarned || 0,
    bonusPointsAwarded: workoutLog?.bonusPointsAwarded || false,
  };
};

// ─── GET /today ───────────────────────────────────────────────────────────────
const getTodayWorkout = async (req, res, next) => {
  try {
    const member = await Member.findById(req.member._id).populate('exercisePlan');
    if (!member.exercisePlan) {
      return successResponse(res, 'No exercise plan assigned', { hasPlan: false });
    }

    const today = toMidnightUTC();
    const dayName = getDayName();

    const daySchedule = member.exercisePlan.schedule.find((s) => s.day === dayName);
    const workoutLog = await WorkoutLog.findOne({ member: member._id, date: today });

    const merged = mergeScheduleWithLog(daySchedule, workoutLog);

    return successResponse(res, "Today's workout fetched", {
      hasPlan: true,
      planName: member.exercisePlan.name,
      planId: member.exercisePlan._id,
      today: dayName,
      workout: merged || {
        day: dayName,
        isRestDay: true,
        focusArea: null,
        exercises: [],
        totalExercises: 0,
        completedCount: 0,
        message: 'No schedule found for today',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /week ────────────────────────────────────────────────────────────────
const getWeekWorkout = async (req, res, next) => {
  try {
    const member = await Member.findById(req.member._id).populate('exercisePlan');
    if (!member.exercisePlan) {
      return successResponse(res, 'No exercise plan assigned', { hasPlan: false });
    }

    const todayName = getDayName();
    const todayMid = toMidnightUTC();

    // Get all workout logs from last 7 days
    const sevenDaysAgo = new Date(todayMid);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const logs = await WorkoutLog.find({
      member: member._id,
      date: { $gte: sevenDaysAgo, $lte: todayMid },
    });

    const logByDay = new Map(
      logs.map((log) => [getDayName(log.date), log]),
    );

    const weekSchedule = member.exercisePlan.schedule.map((daySchedule) => {
      const log = logByDay.get(daySchedule.day) || null;
      const merged = mergeScheduleWithLog(daySchedule, log);
      return {
        ...merged,
        isToday: daySchedule.day === todayName,
      };
    });

    return successResponse(res, 'Week workout plan fetched', {
      hasPlan: true,
      planName: member.exercisePlan.name,
      goal: member.exercisePlan.goal,
      daysPerWeek: member.exercisePlan.daysPerWeek,
      week: weekSchedule,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /complete/:exerciseIndex ────────────────────────────────────────────
const completeExercise = async (req, res, next) => {
  try {
    const { exerciseIndex } = req.params;
    const memberId = req.member._id;
    const gymId = req.member.gym;

    // Step 1: Verify plan assigned
    const member = await Member.findById(memberId).populate('exercisePlan');
    if (!member.exercisePlan) {
      return errorResponse(res, 'No exercise plan assigned to your account', null, 400);
    }

    // Step 2: Find today's schedule + exercise
    const today = toMidnightUTC();
    const dayName = getDayName();
    const daySchedule = member.exercisePlan.schedule.find((s) => s.day === dayName);

    if (!daySchedule || daySchedule.isRestDay) {
      return errorResponse(res, 'Today is a rest day or no schedule found', null, 400);
    }

    const idx = parseInt(exerciseIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= daySchedule.exercises.length) {
      return errorResponse(res, `Invalid exercise index. Today has ${daySchedule.exercises.length} exercise(s).`, null, 400);
    }

    const exercise = daySchedule.exercises[idx];

    // Step 3: Get or create today's WorkoutLog
    let workoutLog = await WorkoutLog.findOne({ member: memberId, date: today });
    if (!workoutLog) {
      workoutLog = new WorkoutLog({
        member: memberId,
        gym: gymId,
        exercisePlan: member.exercisePlan._id,
        date: today,
        day: dayName,
        totalExercises: daySchedule.exercises.length,
        completedExercises: [],
        completedCount: 0,
        isFullyCompleted: false,
        bonusPointsAwarded: false,
        totalPointsEarned: 0,
      });
    }

    // Step 4: Prevent duplicate completion
    const alreadyDone = workoutLog.completedExercises.some((e) => e.exerciseName === exercise.name);
    if (alreadyDone) {
      return errorResponse(res, `"${exercise.name}" is already completed today`, null, 409);
    }

    // Step 5: Fetch gym for points config
    const gym = await Gym.findById(gymId);

    // Step 6: Award exercise points
    const exercisePoints = calcExercisePoints(exercise.pointsValue);

    // Step 7: Add to completed
    workoutLog.completedExercises.push({
      exerciseName: exercise.name,
      pointsEarned: exercisePoints,
      completedAt: new Date(),
    });
    workoutLog.completedCount += 1;
    workoutLog.totalPointsEarned += exercisePoints;

    // Step 8: Full workout bonus check
    let bonusPoints = 0;
    if (workoutLog.completedCount >= workoutLog.totalExercises && !workoutLog.bonusPointsAwarded) {
      workoutLog.isFullyCompleted = true;
      workoutLog.bonusPointsAwarded = true;
      bonusPoints = calcFullWorkoutBonus(gym.pointsConfig);
      workoutLog.totalPointsEarned += bonusPoints;
    }

    await workoutLog.save();

    const totalPointsToAdd = exercisePoints + bonusPoints;

    // Step 9: Update member.totalPoints
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $inc: { totalPoints: totalPointsToAdd } },
      { new: true },
    ).select('-password -refreshToken');

    // Step 10: Create PointsHistory
    await PointsHistory.create({
      member: memberId,
      gym: gymId,
      points: exercisePoints,
      type: 'exercise_complete',
      description: `${exercise.name} completed`,
      refId: workoutLog._id,
    });

    if (bonusPoints > 0) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: bonusPoints,
        type: 'full_workout_bonus',
        description: 'Full workout completed! 🎉',
        refId: workoutLog._id,
      });
    }

    // Step 11: Check badge eligibility
    const newBadges = await checkAndAwardBadges(
      member,
      { currentStreak: updatedMember.currentStreak, totalPoints: updatedMember.totalPoints },
      gymId,
    );

    return successResponse(res, `"${exercise.name}" completed!`, {
      pointsEarned: exercisePoints,
      bonusEarned: bonusPoints,
      totalPointsEarned: workoutLog.totalPointsEarned,
      completedCount: workoutLog.completedCount,
      totalExercises: workoutLog.totalExercises,
      isFullyCompleted: workoutLog.isFullyCompleted,
      newBadges,
      member: {
        totalPoints: updatedMember.totalPoints,
        currentStreak: updatedMember.currentStreak,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /history ─────────────────────────────────────────────────────────────
const getWorkoutHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      WorkoutLog.find({ member: req.member._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('exercisePlan', 'name goal'),
      WorkoutLog.countDocuments({ member: req.member._id }),
    ]);

    return paginatedResponse(res, 'Workout history fetched', logs, buildPagination(total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

module.exports = { getTodayWorkout, getWeekWorkout, completeExercise, getWorkoutHistory };
