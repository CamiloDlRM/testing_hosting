import { api } from './api';
import { Aplicacion, CreateAplicacionData, UpdateAplicacionData, ApiResponse } from '../types';

export const aplicacionService = {
  // Obtener todas las aplicaciones del usuario
  async getMyAplicaciones() {
    const response = await api.get<ApiResponse<Aplicacion[]>>('/aplicacion');
    return response.data;
  },

  // Crear una nueva aplicación
  async createAplicacion(data: CreateAplicacionData) {
    const response = await api.post<ApiResponse<Aplicacion>>('/aplicacion', data);
    return response.data;
  },

  // Actualizar una aplicación específica
  async updateAplicacion(appId: string, data: UpdateAplicacionData) {
    const response = await api.patch<ApiResponse<Aplicacion>>(`/aplicacion/${appId}`, data);
    return response.data;
  },

  // Eliminar una aplicación específica
  async deleteAplicacion(appId: string) {
    const response = await api.delete<ApiResponse>(`/aplicacion/${appId}`);
    return response.data;
  },

  // Deployar una aplicación específica
  async deployAplicacion(appId: string) {
    const response = await api.post<ApiResponse>(`/aplicacion/${appId}/deploy`);
    return response.data;
  },

  // Detener una aplicación específica
  async stopAplicacion(appId: string) {
    const response = await api.post<ApiResponse>(`/aplicacion/${appId}/stop`);
    return response.data;
  },

  // Reiniciar una aplicación específica
  async restartAplicacion(appId: string) {
    const response = await api.post<ApiResponse>(`/aplicacion/${appId}/restart`);
    return response.data;
  },

  // Obtener logs de una aplicación específica
  async getLogs(appId: string, lines: number = 100) {
    const response = await api.get<ApiResponse<{ logs: string }>>(
      `/aplicacion/${appId}/logs?lines=${lines}`
    );
    return response.data;
  },
};
