import { api } from './api';
import { LoginCredentials, RegisterCredentials, User, ApiResponse } from '../types';

export const authService = {
  async register(credentials: RegisterCredentials) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/register',
      credentials
    );
    return response.data;
  },

  async login(credentials: LoginCredentials) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      credentials
    );
    return response.data;
  },

  async getMe() {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};
