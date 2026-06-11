import { apiClient } from "./client";

export const profileApi = {
  getProfile: async () => {
    const res = await apiClient.get("/member/profile");
    return res.data;
  },

  updateProfile: async (data: any) => {
    // If it includes photo, data should be FormData
    const res = await apiClient.put("/member/profile", data);
    return res.data;
  },

  changePassword: async (data: any) => {
    const res = await apiClient.put("/member/profile/change-password", data);
    return res.data;
  },
};
