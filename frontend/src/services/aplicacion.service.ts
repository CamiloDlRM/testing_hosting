import { api } from './api';
import { Aplicacion, CreateAplicacionData, UpdateAplicacionData, ApiResponse } from '../types';

export const aplicacionService = {
  async getMyAplicacion() {
    const response = await api.get<ApiResponse<Aplicacion>>('/aplicacion');
    return response.data;
  },

  async createAplicacion(data: CreateAplicacionData) {
    const response = await api.post<ApiResponse<Aplicacion>>('/aplicacion', data);
    return response.data;
  },

  async updateAplicacion(data: UpdateAplicacionData) {
    const response = await api.patch<ApiResponse<Aplicacion>>('/aplicacion', data);
    return response.data;
  },

  async deleteAplicacion() {
    const response = await api.delete<ApiResponse>('/aplicacion');
    return response.data;
  },

  async deployAplicacion() {
    const response = await api.post<ApiResponse>('/aplicacion/deploy');
    return response.data;
  },

  async stopAplicacion() {
    const response = await api.post<ApiResponse>('/aplicacion/stop');
    return response.data;
  },

  async restartAplicacion() {
    const response = await api.post<ApiResponse>('/aplicacion/restart');
    return response.data;
  },

  async getLogs(lines: number = 100) {
    const response = await api.get<ApiResponse<{ logs: string }>>(
      `/aplicacion/logs?lines=${lines}`
    );
    return response.data;
  },
};
