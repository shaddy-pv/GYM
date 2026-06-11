import { apiClient } from "./client";

export const membersApi = {
  getMembers: async (gymId: string, params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const res = await apiClient.get(`/gyms/${gymId}/members`, { params });
    return res.data;
  },

  getMember: async (gymId: string, memberId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/members/${memberId}`);
    return res.data;
  },

  createMember: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/members`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateMember: async (gymId: string, memberId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteMember: async (gymId: string, memberId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/members/${memberId}`);
    return res.data;
  },

  resetPassword: async (gymId: string, memberId: string) => {
    const res = await apiClient.post(`/gyms/${gymId}/members/${memberId}/reset-password`);
    return res.data;
  },

  getMemberStats: async (gymId: string, memberId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/members/${memberId}/stats`);
    return res.data;
  },

  suspendMember: async (gymId: string, memberId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}/suspend`);
    return res.data;
  },

  activateMember: async (gymId: string, memberId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}/activate`);
    return res.data;
  },

  assignTrainer: async (gymId: string, memberId: string, trainerId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}/assign-trainer`, { trainerId });
    return res.data;
  },

  assignMealPlan: async (gymId: string, memberId: string, mealPlanId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}/assign-meal-plan`, { mealPlanId });
    return res.data;
  },

  assignExercisePlan: async (gymId: string, memberId: string, exercisePlanId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/members/${memberId}/assign-exercise-plan`, { exercisePlanId });
    return res.data;
  },
};
