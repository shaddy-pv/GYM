import { apiClient } from "./client";

export const authApi = {
  login: async (credentials: any) => {
    const res = await apiClient.post("/auth/login", credentials);
    return res.data;
  },

  register: async (data: any) => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (data: any) => {
    const res = await apiClient.post("/auth/reset-password", data);
    return res.data;
  },
};
