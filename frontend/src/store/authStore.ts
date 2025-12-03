import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    authService.logout();
    set({ token: null, user: null, isAuthenticated: false });
  },

  initAuth: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await authService.getMe();
      if (response.success && response.data) {
        set({
          user: response.data,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('token');
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      localStorage.removeItem('token');
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
