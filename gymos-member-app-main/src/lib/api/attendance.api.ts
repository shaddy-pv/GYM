import { apiClient } from "./client";

export const attendanceApi = {
  checkIn: async () => {
    const res = await apiClient.post("/member/attendance/checkin");
    return res.data;
  },

  checkOut: async () => {
    const res = await apiClient.post("/member/attendance/checkout");
    return res.data;
  },

  getAttendance: async (params?: { month?: number; year?: number }) => {
    const res = await apiClient.get("/member/attendance", { params });
    return res.data;
  },

  getStreak: async () => {
    const res = await apiClient.get("/member/attendance/streak");
    return res.data;
  },
};
