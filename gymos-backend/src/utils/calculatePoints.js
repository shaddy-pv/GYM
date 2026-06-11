/**
 * Points calculation pure functions
 */

/**
 * Calculate attendance points for a gym config
 * @param {object} pointsConfig - Gym's pointsConfig subdocument
 */
const calcAttendancePoints = (pointsConfig) => {
  return pointsConfig?.perAttendance ?? 10;
};

/**
 * Calculate points for a single exercise
 * @param {number} exercisePointsValue - From ExercisePlan exercise.pointsValue
 */
const calcExercisePoints = (exercisePointsValue) => {
  return exercisePointsValue ?? 15;
};

/**
 * Calculate full-workout bonus points
 * @param {object} pointsConfig
 */
const calcFullWorkoutBonus = (pointsConfig) => {
  return pointsConfig?.fullWorkoutBonus ?? 50;
};

/**
 * Calculate streak bonus points
 * @param {object} pointsConfig
 * @param {number} currentStreak
 * @returns {{ eligible: boolean, points: number }}
 */
const calcStreakBonus = (pointsConfig, currentStreak) => {
  const streakDays = pointsConfig?.streakBonus?.days ?? 7;
  const streakPoints = pointsConfig?.streakBonus?.points ?? 100;

  if (currentStreak > 0 && currentStreak % streakDays === 0) {
    return { eligible: true, points: streakPoints };
  }
  return { eligible: false, points: 0 };
};

/**
 * Determine which badges a member should have based on stats
 * @param {object} member - Member document
 * @returns {string[]} - Array of new badges to add
 */
const evaluateBadges = (member) => {
  const newBadges = [];
  const existing = member.badges || [];

  if (member.currentStreak >= 7 && !existing.includes('on_fire')) {
    newBadges.push('on_fire');
  }
  if (member.totalPoints >= 1000 && !existing.includes('beast_mode')) {
    newBadges.push('beast_mode');
  }
  if (member.longestStreak >= 30 && !existing.includes('consistent')) {
    newBadges.push('consistent');
  }
  if (member.totalPoints >= 5000 && !existing.includes('champion')) {
    newBadges.push('champion');
  }
  if (member.longestStreak >= 100 && !existing.includes('streak_master')) {
    newBadges.push('streak_master');
  }

  return newBadges;
};

/**
 * Update member streak based on lastCheckIn
 * @param {Date|null} lastCheckIn
 * @param {number} currentStreak
 * @returns {{ newStreak: number }}
 */
const updateStreak = (lastCheckIn, currentStreak) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!lastCheckIn) {
    return { newStreak: 1 };
  }

  const lastDate = new Date(lastCheckIn);
  lastDate.setHours(0, 0, 0, 0);

  if (lastDate.getTime() === yesterday.getTime()) {
    return { newStreak: currentStreak + 1 };
  } else if (lastDate.getTime() === today.getTime()) {
    return { newStreak: currentStreak }; // Already checked in today
  } else {
    return { newStreak: 1 }; // Streak broken
  }
};

module.exports = {
  calcAttendancePoints,
  calcExercisePoints,
  calcFullWorkoutBonus,
  calcStreakBonus,
  evaluateBadges,
  updateStreak,
};
