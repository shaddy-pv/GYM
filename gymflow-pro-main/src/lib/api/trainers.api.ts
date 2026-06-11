import { apiClient } from "./client";

export const trainersApi = {
  getTrainers: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/trainers`);
    return res.data;
  },

  createTrainer: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/trainers`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateTrainer: async (gymId: string, trainerId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/trainers/${trainerId}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteTrainer: async (gymId: string, trainerId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/trainers/${trainerId}`);
    return res.data;
  },
};
