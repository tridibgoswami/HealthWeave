/**
 * HealthWeave – Auth Store (Zustand)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../services/api";

interface UserProfile {
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  chronic_conditions: string[];
  known_allergies: string[];
}

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  is_verified: boolean;
  profile: UserProfile | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.login({ email, password });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem("hw_access_token", access_token);
          localStorage.setItem("hw_refresh_token", refresh_token);
          await get().fetchMe();
          set({ isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({
            error: err.response?.data?.detail || "Login failed",
            isLoading: false,
          });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.register(data);
          const { access_token, refresh_token } = res.data;
          localStorage.setItem("hw_access_token", access_token);
          localStorage.setItem("hw_refresh_token", refresh_token);
          await get().fetchMe();
          set({ isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({
            error: err.response?.data?.detail || "Registration failed",
            isLoading: false,
          });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("hw_access_token");
        localStorage.removeItem("hw_refresh_token");
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await authApi.getMe();
          set({ user: res.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "hw-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
