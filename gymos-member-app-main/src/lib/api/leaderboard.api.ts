import { apiClient } from "./client";

export const leaderboardApi = {
  getLeaderboard: async (period: "week" | "month" | "all" = "week", scope: "gym" | "global" = "gym") => {
    const res = await apiClient.get("/member/leaderboard", { params: { period, scope } });
    return res.data;
  },
};
