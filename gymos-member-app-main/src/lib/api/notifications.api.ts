import { apiClient } from "./client";

export const notificationsApi = {
  getNotifications: async () => {
    const res = await apiClient.get("/member/notifications");
    return res.data;
  },

  markAsRead: async (notificationId: string) => {
    const res = await apiClient.put(`/member/notifications/read/${notificationId}`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await apiClient.put("/member/notifications/read-all");
    return res.data;
  },
};

