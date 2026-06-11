import { apiClient } from "./client";

export const dashboardApi = {
  getStats: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/dashboard`);
    return res.data;
  },
};
