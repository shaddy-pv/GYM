import { apiClient } from "./client";

export const authApi = {
  login: async (credentials: any) => {
    const res = await apiClient.post("/member/auth/login", credentials);
    return res.data;
  },

  forgotPassword: async (data: any) => {
    // Optional if you implement it
    const res = await apiClient.post("/member/auth/forgot-password", data);
    return res.data;
  },
};
