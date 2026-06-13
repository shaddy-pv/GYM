import axios from "axios";

export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("memberAccessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("memberRefreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/member/auth/refresh`,
          { refreshToken }
        );

        if (res.data.data.accessToken) {
          localStorage.setItem("memberAccessToken", res.data.data.accessToken);
          localStorage.setItem("memberRefreshToken", res.data.data.refreshToken);
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${res.data.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (err) {
        localStorage.removeItem("memberAccessToken");
        localStorage.removeItem("memberRefreshToken");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);
