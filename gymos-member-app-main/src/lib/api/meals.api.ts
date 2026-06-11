import { apiClient } from "./client";

export const mealsApi = {
  getMealPlan: async () => {
    const res = await apiClient.get("/member/meals");
    return res.data;
  },

  getTodayMeals: async () => {
    const res = await apiClient.get("/member/meals/today");
    return res.data;
  },
  completeMeal: async (mealIndex: number) => {
    const res = await apiClient.post(`/member/meals/${mealIndex}/complete`);
    return res.data;
  },
};
