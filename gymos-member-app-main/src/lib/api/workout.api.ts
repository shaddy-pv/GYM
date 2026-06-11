import { apiClient } from "./client";

export const workoutApi = {
  getTodayWorkout: async () => {
    const res = await apiClient.get("/member/workout/today");
    return res.data;
  },

  getWeekWorkout: async () => {
    const res = await apiClient.get("/member/workout/week");
    return res.data;
  },

  getWorkoutHistory: async () => {
    const res = await apiClient.get("/member/workout/history");
    return res.data;
  },

  completeExercise: async (exerciseIndex: number, data: any) => {
    const res = await apiClient.post(`/member/workout/complete/${exerciseIndex}`, data);
    return res.data;
  },
};
