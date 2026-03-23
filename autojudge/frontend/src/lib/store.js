// This file drives the store feature flow and keeps the behavior easy to reason about.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}), { name: 'auth-store', partialize: (s) => ({ user: s.user }) }));

export const useSubmissionStore = create((set) => ({
  currentSubmission: null,
  isRunning: false,
  setSubmission: (s) => set({ currentSubmission: s }),
  setRunning: (v) => set({ isRunning: v }),
}));
