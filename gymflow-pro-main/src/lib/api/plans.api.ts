import { apiClient } from "./client";

export const plansApi = {
  getPlans: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/plans`);
    return res.data;
  },

  createPlan: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/plans`, data);
    return res.data;
  },

  updatePlan: async (gymId: string, planId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/plans/${planId}`, data);
    return res.data;
  },

  deletePlan: async (gymId: string, planId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/plans/${planId}`);
    return res.data;
  },
};
