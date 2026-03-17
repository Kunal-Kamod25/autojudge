import axios from 'axios';
import { BACKEND_URL } from '@/config'

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Auto-attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const state = JSON.parse(localStorage.getItem('auth-store') || '{}');
      const token = state?.state?.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch(e) {}
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
      orig._retry = true;
      try {
        const { data } = await api.post('/api/auth/refresh');
        const { useAuthStore } = await import('./store');
        useAuthStore.getState().setToken(data.accessToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch(e) {
        const { useAuthStore } = await import('./store');
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  register: (d) => api.post('/api/auth/register', d),
  login: (d) => api.post('/api/auth/login', d),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
  forgotPassword: (d) => api.post('/api/auth/forgot-password', d),
  verifyOTP: (d) => api.post('/api/auth/verify-otp', d),
  resetPassword: (d) => api.post('/api/auth/reset-password', d),
  refresh: () => api.post('/api/auth/refresh'),
};

export const userApi = {
  getProfile: (id) => api.get(`/api/users/profile/${id}`),
  updateProfile: (d) => api.put('/api/users/profile', d),
  changePassword: (d) => api.put('/api/users/password', d),
};

export const submissionApi = {
  submit: (d) => api.post('/api/submissions', d),
  submitFile: (fd) => api.post('/api/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  extractZip: (fd) => api.post('/api/submissions/extract-zip', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  runCustom: (d) => api.post('/api/submissions/run', d),
  runCustomFile: (fd) => api.post('/api/submissions/run', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMySubmissions: (p) => api.get('/api/submissions/me', { params: p }),
  getSubmission: (id) => api.get(`/api/submissions/${id}`),
  downloadPDF: (id) => api.get(`/api/submissions/${id}/pdf`, { responseType: 'blob' }),
};

export const assignmentApi = {
  getAll: () => api.get('/api/assignments'),
  getOne: (id) => api.get(`/api/assignments/${id}`),
  create: (d) => api.post('/api/assignments', d),
  update: (id, d) => api.put(`/api/assignments/${id}`, d),
  delete: (id) => api.delete(`/api/assignments/${id}`),
  generateTests: (id, d) => api.post(`/api/assignments/${id}/generate-tests`, d),
};

export const practiceApi = {
  getProblems: (p) => api.get('/api/practice', { params: p }),
  getProblem: (id) => api.get(`/api/practice/${id}`),
};

export const reportApi = {
  teacherDashboard: () => api.get('/api/reports/teacher/dashboard'),
  studentDashboard: () => api.get('/api/reports/student/dashboard'),
};


export const notificationApi = {
  getAll: (p) => api.get('/api/notifications', { params: p }),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

export const leaderboardApi = {
  getAll: (p) => api.get('/api/leaderboard', { params: p }),
  getMyRank: () => api.get('/api/leaderboard/me'),
};

export const adminApi = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: (p) => api.get('/api/admin/users', { params: p }),
  toggleUser: (id) => api.patch(`/api/admin/users/${id}/toggle`),
  createPractice: (d) => api.post('/api/admin/practice', d),
  deletePractice: (id) => api.delete(`/api/admin/practice/${id}`),
};
