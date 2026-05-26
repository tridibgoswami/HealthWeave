import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/endpoints';

interface User {
  id: string;
  email: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    blood_group?: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string; password: string;
    first_name: string; last_name: string; phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) { set({ isLoading: false }); return; }
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    await SecureStore.setItemAsync('access_token', data.access_token);
    await SecureStore.setItemAsync('refresh_token', data.refresh_token);
    const me = await authApi.me();
    set({ user: me.data, isAuthenticated: true });
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData);
    await SecureStore.setItemAsync('access_token', data.access_token);
    await SecureStore.setItemAsync('refresh_token', data.refresh_token);
    const me = await authApi.me();
    set({ user: me.data, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));
