import { apiClient } from "./client";

export const gymApi = {
  getMyGyms: async () => {
    const res = await apiClient.get("/gyms");
    return res.data;
  },

  getGymDashboard: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/dashboard`);
    return res.data;
  },

  createGym: async (data: any) => {
    const res = await apiClient.post("/gyms", data);
    return res.data;
  },

  getGym: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}`);
    return res.data;
  },

  updateGym: async (gymId: string, data: any) => {
    // Note: if data is FormData for image uploads, handle it accordingly.
    // For now we assume the caller sets it up correctly or it's a simple JSON object
    const res = await apiClient.put(`/gyms/${gymId}`, data);
    return res.data;
  },

  updatePointsConfig: async (gymId: string, data: any) => {
    const res = await apiClient.put(`/gyms/${gymId}/points-config`, data);
    return res.data;
  },

  getLeaderboard: async (gymId: string, period: string, scope: "gym" | "global" = "gym") => {
    const res = await apiClient.get(`/gyms/${gymId}/leaderboard`, { params: { period, scope } });
    return res.data;
  },

  getAdminNotifications: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/notifications/admin`);
    return res.data;
  },

  markAllAdminRead: async (gymId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/notifications/admin/read-all`);
    return res.data;
  },

  markAdminRead: async (gymId: string, notifId: string) => {
    const res = await apiClient.put(`/gyms/${gymId}/notifications/admin/read/${notifId}`);
    return res.data;
  },
};
