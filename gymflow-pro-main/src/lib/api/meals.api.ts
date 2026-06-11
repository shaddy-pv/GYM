import { apiClient } from "./client";

export const mealsApi = {
  getPlans: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/meal-plans`);
    return res.data;
  },

  createPlan: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/meal-plans`, data);
    return res.data;
  },

  updatePlan: async (gymId: string, planId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/meal-plans/${planId}`, data);
    return res.data;
  },

  deletePlan: async (gymId: string, planId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/meal-plans/${planId}`);
    return res.data;
  },
};
