import { api } from './api';
import { Aplicacion, CreateAplicacionData, UpdateAplicacionData, ApiResponse } from '../types';

export type LogStreamEvent =
  | { type: 'log'; content: string }
  | { type: 'done'; status: string }
  | { type: 'error'; content: string }
  | { type: 'coolify_link'; content: string; url: string };

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

  // Obtener logs de una aplicación específica (snapshot, sin streaming)
  async getLogs(appId: string, lines: number = 100) {
    const response = await api.get<ApiResponse<{ logs: string }>>(
      `/aplicacion/${appId}/logs?lines=${lines}`
    );
    return response.data;
  },

  /** Obtiene la lista de servicios de una app Docker Compose. */
  async getComposeServices(appId: string): Promise<string[]> {
    const response = await api.get<ApiResponse<string[]>>(`/aplicacion/${appId}/logs/services`);
    return response.data.data ?? [];
  },

  /**
   * Abre un stream SSE de logs de runtime.
   * Para compose, pasar `service` para filtrar por contenedor.
   * Devuelve una función para cerrar el stream.
   */
  streamRuntimeLogs(appId: string, token: string, onEvent: (e: LogStreamEvent) => void, service?: string): () => void {
    const serviceParam = service ? `&service=${encodeURIComponent(service)}` : '';
    const url = `${api.defaults.baseURL}/aplicacion/${appId}/logs/runtime/stream?token=${encodeURIComponent(token)}${serviceParam}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* ignorar mensajes mal formados */ }
    };
    es.onerror = () => {
      onEvent({ type: 'error', content: 'Connection lost. Retrying...' });
    };
    return () => es.close();
  },

  /**
   * Abre un stream SSE de logs de build del deployment más reciente.
   * Se cierra automáticamente cuando el deployment termina.
   * Devuelve una función para cerrar el stream manualmente.
   */
  streamBuildLogs(appId: string, token: string, onEvent: (e: LogStreamEvent) => void): () => void {
    const url = `${api.defaults.baseURL}/aplicacion/${appId}/logs/build/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const data: LogStreamEvent = JSON.parse(e.data);
        onEvent(data);
        if (data.type === 'done') es.close();
      } catch { /* ignorar */ }
    };
    es.onerror = () => {
      onEvent({ type: 'error', content: 'Connection lost. Retrying...' });
    };
    return () => es.close();
  },
};
