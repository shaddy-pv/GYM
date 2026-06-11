import { apiClient } from "./client";

export const attendanceApi = {
  getTodayAttendance: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/attendance/today`);
    return res.data;
  },

  // Alias used by the attendance page
  getGymAttendance: async (gymId: string, params?: { date?: string; month?: string }) => {
    const res = await apiClient.get(`/gyms/${gymId}/attendance/today`, { params });
    return res.data;
  },

  getMonthlySummary: async (gymId: string, month?: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/attendance/summary`, {
      params: { month },
    });
    return res.data;
  },

  exportCSV: async (gymId: string, month?: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/attendance/export`, {
      params: { month },
      responseType: 'blob'
    });
    return res.data;
  },

  getMemberAttendance: async (gymId: string, memberId: string, params?: { page?: number; limit?: number; month?: string }) => {
    const res = await apiClient.get(`/gyms/${gymId}/attendance/member/${memberId}`, { params });
    return res.data;
  },

  // Accepts a memberId string and wraps it into the correct { memberId } body
  markAttendance: async (gymId: string, memberId: string) => {
    const res = await apiClient.post(`/gyms/${gymId}/attendance/mark`, { memberId });
    return res.data;
  },
};
