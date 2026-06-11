import { apiClient } from "./client";

export const exercisesApi = {
  getPlans: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/exercise-plans`);
    return res.data;
  },

  createPlan: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/exercise-plans`, data);
    return res.data;
  },

  updatePlan: async (gymId: string, planId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/exercise-plans/${planId}`, data);
    return res.data;
  },

  deletePlan: async (gymId: string, planId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/exercise-plans/${planId}`);
    return res.data;
  },
};
