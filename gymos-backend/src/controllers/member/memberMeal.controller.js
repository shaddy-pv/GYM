const Member = require('../../models/Member.model');
const MealPlan = require('../../models/MealPlan.model');
const MealLog = require('../../models/MealLog.model');
const PointsHistory = require('../../models/PointsHistory.model');
const Gym = require('../../models/Gym.model');
const { checkAndAwardBadges } = require('../../utils/checkAndAwardBadges');
const { successResponse, errorResponse } = require('../../utils/ApiResponse');

// ─── Helper: normalize date to midnight UTC ────────────────────────────────────
const toMidnightUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Helper: get day name ─────────────────────────────────────────────────────
const getDayName = (d = new Date()) =>
  d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

/**
 * Determine current and next meal based on IST time
 */
const getCurrentMealContext = (meals = []) => {
  // Current IST time (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const totalMinutes = hour * 60 + minute;

  // Meal time windows (start minutes from midnight IST)
  const mealWindows = {
    breakfast: { start: 6 * 60, end: 10 * 60 },      // 6AM - 10AM
    mid_morning: { start: 10 * 60, end: 12 * 60 },    // 10AM - 12PM
    lunch: { start: 12 * 60, end: 15 * 60 },           // 12PM - 3PM
    evening_snack: { start: 15 * 60, end: 19 * 60 },  // 3PM - 7PM
    dinner: { start: 19 * 60, end: 22 * 60 },          // 7PM - 10PM
  };

  let currentMeal = null;
  let nextMeal = null;

  for (const meal of meals) {
    const window = mealWindows[meal.type];
    if (!window) continue;

    if (totalMinutes >= window.start && totalMinutes < window.end) {
      currentMeal = meal.type;
    } else if (totalMinutes < window.start && !nextMeal) {
      nextMeal = meal.type;
    }
  }

  return { currentMeal, nextMeal };
};

// ─── GET / ────────────────────────────────────────────────────────────────────
const getMealPlan = async (req, res, next) => {
  try {
    const member = await Member.findById(req.member._id).populate('mealPlan');

    // Member has an assigned plan
    if (member.mealPlan) {
      return successResponse(res, 'Meal plan fetched', {
        isSuggested: false,
        plan: member.mealPlan,
      });
    }

    // Auto-suggest based on first goal
    const primaryGoal = member.goals?.[0];
    let suggestedPlan = null;

    if (primaryGoal) {
      suggestedPlan = await MealPlan.findOne({
        gym: member.gym,
        goal: primaryGoal,
        isTemplate: true,
        isActive: true,
      });
    }

    // Fallback: any active plan in the gym
    if (!suggestedPlan) {
      suggestedPlan = await MealPlan.findOne({ gym: member.gym, isActive: true });
    }

    if (!suggestedPlan) {
      return successResponse(res, 'No meal plan available yet. Please contact your gym.', {
        isSuggested: false,
        plan: null,
      });
    }

    return successResponse(res, 'Suggested meal plan based on your goal', {
      isSuggested: true,
      suggestedFor: primaryGoal || 'general',
      plan: suggestedPlan,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /today ───────────────────────────────────────────────────────────────
const getTodayMeals = async (req, res, next) => {
  try {
    const member = await Member.findById(req.member._id).populate('mealPlan');

    let plan = member.mealPlan;
    let isSuggested = false;

    if (!plan) {
      const primaryGoal = member.goals?.[0];
      plan = await MealPlan.findOne({
        gym: member.gym,
        goal: primaryGoal || undefined,
        isActive: true,
      });
      isSuggested = !!plan;
    }

    if (!plan) {
      return successResponse(res, 'No meal plan assigned', { hasPlan: false });
    }

    const { currentMeal, nextMeal } = getCurrentMealContext(plan.meals);
    const today = toMidnightUTC();
    const mealLog = await MealLog.findOne({ member: member._id, date: today });
    
    // Merge completion status into meals
    const completedMap = new Map((mealLog?.completedMeals || []).map(m => [m.mealName, m]));
    const mealsWithStatus = plan.meals.map((meal, index) => {
      const mealName = meal.type || meal.mealTime || meal.name || `Meal ${index + 1}`;
      const completedInfo = completedMap.get(mealName);
      return {
        ...meal.toObject(),
        isCompleted: !!completedInfo,
        completedAt: completedInfo?.completedAt || null
      };
    });

    return successResponse(res, "Today's meal plan", {
      hasPlan: true,
      isSuggested,
      planName: plan.name,
      planId: plan._id,
      goal: plan.goal,
      totalCalories: plan.totalCalories,
      macros: plan.macros,
      waterIntakeLiters: plan.waterIntakeLiters,
      currentMeal,
      nextMeal,
      meals: mealsWithStatus,
      additionalNotes: plan.additionalNotes,
      completedCount: mealLog?.completedCount || 0,
      isFullyCompleted: mealLog?.isFullyCompleted || false
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /complete/:mealIndex ────────────────────────────────────────────────
const completeMeal = async (req, res, next) => {
  try {
    const { mealIndex } = req.params;
    const memberId = req.member._id;
    const gymId = req.member.gym;

    const member = await Member.findById(memberId).populate('mealPlan');
    let plan = member.mealPlan;

    if (!plan) {
      const primaryGoal = member.goals?.[0];
      plan = await MealPlan.findOne({
        gym: member.gym,
        goal: primaryGoal || undefined,
        isActive: true,
      });
    }

    if (!plan) {
      return errorResponse(res, 'No meal plan assigned to your account', null, 400);
    }

    const idx = parseInt(mealIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= plan.meals.length) {
      return errorResponse(res, `Invalid meal index. Today has ${plan.meals.length} meal(s).`, null, 400);
    }

    const meal = plan.meals[idx];
    const mealName = meal.type || meal.mealTime || meal.name || `Meal ${idx + 1}`;
    const today = toMidnightUTC();
    const dayName = getDayName();

    let mealLog = await MealLog.findOne({ member: memberId, date: today });
    if (!mealLog) {
      mealLog = new MealLog({
        member: memberId,
        gym: gymId,
        mealPlan: plan._id,
        date: today,
        day: dayName,
        totalMeals: plan.meals.length,
        completedMeals: [],
        completedCount: 0,
        isFullyCompleted: false,
        bonusPointsAwarded: false,
        totalPointsEarned: 0,
      });
    }

    const alreadyDone = mealLog.completedMeals.some((m) => m.mealName === mealName);
    if (alreadyDone) {
      return errorResponse(res, `"${mealName}" is already completed today`, null, 409);
    }

    const gym = await Gym.findById(gymId);
    
    // Points rule: 5 points for a meal, maybe? Let's give 5 points.
    const mealPoints = 5;

    mealLog.completedMeals.push({
      mealName: mealName,
      pointsEarned: mealPoints,
      completedAt: new Date(),
    });
    mealLog.completedCount += 1;
    mealLog.totalPointsEarned += mealPoints;

    let bonusPoints = 0;
    if (mealLog.completedCount >= mealLog.totalMeals && !mealLog.bonusPointsAwarded) {
      mealLog.isFullyCompleted = true;
      mealLog.bonusPointsAwarded = true;
      bonusPoints = 20; // 20 bonus points for full day meals
      mealLog.totalPointsEarned += bonusPoints;
    }

    await mealLog.save();

    const totalPointsToAdd = mealPoints + bonusPoints;

    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $inc: { totalPoints: totalPointsToAdd } },
      { new: true },
    ).select('-password -refreshToken');

    await PointsHistory.create({
      member: memberId,
      gym: gymId,
      points: mealPoints,
      type: 'meal_complete',
      description: `${mealName} logged`,
      refId: mealLog._id,
    });

    if (bonusPoints > 0) {
      await PointsHistory.create({
        member: memberId,
        gym: gymId,
        points: bonusPoints,
        type: 'full_meal_bonus',
        description: 'All meals tracked today! 🥗',
        refId: mealLog._id,
      });
    }

    const newBadges = await checkAndAwardBadges(
      member,
      { currentStreak: updatedMember.currentStreak, totalPoints: updatedMember.totalPoints },
      gymId,
    );

    return successResponse(res, `"${mealName}" marked complete!`, {
      pointsEarned: mealPoints,
      bonusEarned: bonusPoints,
      totalPointsEarned: mealLog.totalPointsEarned,
      completedCount: mealLog.completedCount,
      totalMeals: mealLog.totalMeals,
      isFullyCompleted: mealLog.isFullyCompleted,
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

module.exports = { getMealPlan, getTodayMeals, completeMeal };
