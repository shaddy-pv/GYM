import { apiClient } from "./client";

export const pointsApi = {
  getPointsSummary: async () => {
    const res = await apiClient.get("/member/points");
    return res.data;
  },

  getPointsHistory: async () => {
    const res = await apiClient.get("/member/points/history");
    return res.data;
  },

  getBadges: async () => {
    const res = await apiClient.get("/member/points/badges");
    return res.data;
  },
};
