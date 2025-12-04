import axios, { AxiosInstance } from 'axios';
import {
  CoolifyAppConfig,
  CoolifyAppResponse,
  CoolifyDeploymentResponse,
} from '../types';

class CoolifyService {
  private api: AxiosInstance;
  private projectUuid: string;
  private serverUuid: string;
  private environmentName: string;

  constructor() {
    const apiUrl = process.env.COOLIFY_API_URL;
    const apiToken = process.env.COOLIFY_API_TOKEN;
    this.projectUuid = process.env.COOLIFY_PROJECT_UUID || '';
    this.serverUuid = process.env.COOLIFY_SERVER_UUID || '';
    this.environmentName = process.env.COOLIFY_ENVIRONMENT_NAME || 'production';

    if (!apiUrl || !apiToken) {
      throw new Error('Coolify API credentials not configured');
    }

    if (!this.projectUuid || !this.serverUuid) {
      throw new Error('Coolify project UUID and server UUID must be configured');
    }

    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Crear una nueva aplicación en Coolify
   */
  async createApplication(config: CoolifyAppConfig): Promise<CoolifyAppResponse> {
    try {
      // Crear payload sin environment_variables (se configuran después de crear la app)
      const payload = {
        project_uuid: this.projectUuid,
        server_uuid: this.serverUuid,
        environment_name: this.environmentName,
        name: config.name,
        git_repository: config.git_repository,
        git_branch: config.git_branch || 'main',
        build_pack: config.build_pack || 'nixpacks',
        ports_exposes: '3000',
        // NO incluir environment_variables en la creación
        ...(config.domains && { domains: config.domains }),
      };

      const response = await this.api.post('/applications/public', payload);

      // Coolify devuelve { uuid: "..." } en el response
      const appId = response.data.uuid;

      // Si hay variables de entorno, configurarlas después de crear la app
      if (config.environment_variables && Object.keys(config.environment_variables).length > 0) {
        try {
          await this.updateEnvironmentVariables(appId, config.environment_variables);
        } catch (envError) {
          console.warn('Failed to set environment variables, but app was created:', envError);
          // No lanzar error, la app se creó exitosamente
        }
      }

      return {
        id: appId,
        name: config.name,
        status: 'pending',
        git_repository: config.git_repository,
        domains: config.domains || [],
        created_at: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Error creating application in Coolify:', error.response?.data || error.message);
      throw new Error(`Failed to create application in Coolify: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Obtener información de una aplicación
   */
  async getApplication(appId: string): Promise<CoolifyAppResponse> {
    try {
      const response = await this.api.get(`/applications/${appId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching application from Coolify:', error.response?.data || error.message);
      throw new Error(`Failed to fetch application from Coolify: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Actualizar variables de entorno de una aplicación
   */
  async updateEnvironmentVariables(
    appId: string,
    variables: Record<string, string>
  ): Promise<void> {
    try {
      await this.api.patch(`/applications/${appId}/environment`, {
        environment_variables: variables,
      });
    } catch (error: any) {
      console.error('Error updating environment variables:', error.response?.data || error.message);
      throw new Error(`Failed to update environment variables: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Deployar una aplicación
   */
  async deployApplication(appId: string): Promise<CoolifyDeploymentResponse> {
    try {
      const response = await this.api.post(`/applications/${appId}/deploy`);
      return response.data;
    } catch (error: any) {
      console.error('Error deploying application:', error.response?.data || error.message);
      throw new Error(`Failed to deploy application: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Detener una aplicación
   */
  async stopApplication(appId: string): Promise<void> {
    try {
      await this.api.post(`/applications/${appId}/stop`);
    } catch (error: any) {
      console.error('Error stopping application:', error.response?.data || error.message);
      throw new Error(`Failed to stop application: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Reiniciar una aplicación
   */
  async restartApplication(appId: string): Promise<void> {
    try {
      await this.api.post(`/applications/${appId}/restart`);
    } catch (error: any) {
      console.error('Error restarting application:', error.response?.data || error.message);
      throw new Error(`Failed to restart application: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Eliminar una aplicación
   */
  async deleteApplication(appId: string): Promise<void> {
    try {
      await this.api.delete(`/applications/${appId}`);
    } catch (error: any) {
      console.error('Error deleting application:', error.response?.data || error.message);
      throw new Error(`Failed to delete application: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Obtener logs de una aplicación
   */
  async getApplicationLogs(appId: string, lines: number = 100): Promise<string> {
    try {
      const response = await this.api.get(`/applications/${appId}/logs`, {
        params: { lines },
      });
      return response.data.logs || '';
    } catch (error: any) {
      console.error('Error fetching logs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch logs: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Obtener el estado de un deployment
   */
  async getDeploymentStatus(appId: string, deploymentId: string): Promise<CoolifyDeploymentResponse> {
    try {
      const response = await this.api.get(`/applications/${appId}/deployments/${deploymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching deployment status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch deployment status: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default new CoolifyService();
