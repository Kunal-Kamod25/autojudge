import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setToken: (accessToken) => set({ accessToken }),
  setLoading: (isLoading) => set({ isLoading }),
  login: (user, accessToken) => set({ user, accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}), { name: 'auth-store', partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) }));

export const useSubmissionStore = create((set) => ({
  currentSubmission: null,
  isRunning: false,
  setSubmission: (s) => set({ currentSubmission: s }),
  setRunning: (v) => set({ isRunning: v }),
}));
