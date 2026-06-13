import { apiClient } from "./client";

export const authApi = {
  login: async (credentials: any) => {
    const res = await apiClient.post("/member/auth/login", credentials);
    return res.data;
  },

  forgotPassword: async (data: any) => {
    const res = await apiClient.post("/member/auth/forgot-password", data);
    return res.data;
  },

  resetPassword: async (data: any) => {
    const res = await apiClient.post("/member/auth/reset-password", data);
    return res.data;
  },
};
