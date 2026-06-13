import { apiClient } from "./client";

export const paymentsApi = {
  getPayments: async (gymId: string, params?: { page?: number; limit?: number; search?: string; status?: string; month?: string; sortBy?: string; sortOrder?: string }) => {
    const res = await apiClient.get(`/gyms/${gymId}/payments`, { params });
    return res.data;
  },

  createPayment: async (gymId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/payments`, data);
    return res.data;
  },

  deletePayment: async (gymId: string, paymentId: string) => {
    const res = await apiClient.delete(`/gyms/${gymId}/payments/${paymentId}`);
    return res.data;
  },

  recordPartialPayment: async (gymId: string, paymentId: string, data: any) => {
    const res = await apiClient.post(`/gyms/${gymId}/payments/${paymentId}/pay`, data);
    return res.data;
  },

  waiveDue: async (gymId: string, paymentId: string) => {
    const res = await apiClient.post(`/gyms/${gymId}/payments/${paymentId}/waive`);
    return res.data;
  },

  downloadReceipt: async (gymId: string, paymentId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/payments/${paymentId}/receipt`, {
      responseType: 'blob'
    });
    return res.data;
  },

  getPaymentStats: async (gymId: string) => {
    const res = await apiClient.get(`/gyms/${gymId}/payments/stats`);
    return res.data;
  },
};
