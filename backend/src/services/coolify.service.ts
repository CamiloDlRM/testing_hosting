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
      // Determinar si es aplicación estática
      const isStatic = config.build_pack === 'static' || config.is_static === true;

      // Crear payload con campos obligatorios
      const payload: any = {
        project_uuid: this.projectUuid,
        server_uuid: this.serverUuid,
        environment_name: this.environmentName,
        name: config.name,
        git_repository: config.git_repository,
        git_branch: config.git_branch || 'main',
        build_pack: config.build_pack || 'nixpacks',
      };

      // Configurar puertos
      // Para apps estáticas, usar puerto 80 (default para servir archivos estáticos)
      // Para apps con servidor, usar el puerto configurado
      if (isStatic) {
        payload.ports_exposes = '80';
      } else if (config.ports_exposes) {
        payload.ports_exposes = config.ports_exposes;
      }

      // Agregar campos opcionales solo si tienen valores (y no son strings vacíos)
      if (config.install_command && config.install_command.trim() !== '') {
        payload.install_command = config.install_command;
      }

      if (config.build_command && config.build_command.trim() !== '') {
        payload.build_command = config.build_command;
      }

      // Para Python/FastAPI: SIEMPRE agregar start_command si no es estático
      // Esto evita que Coolify genere un plan con "python main.py" que no funciona
      if (config.start_command && config.start_command.trim() !== '') {
        payload.start_command = config.start_command;
      } else if (!isStatic && config.build_pack === 'nixpacks') {
        // Si no hay start_command y es nixpacks, dejar que Nixpacks detecte automáticamente
        // pero esto puede causar problemas con FastAPI
      }

      if (config.base_directory && config.base_directory.trim() !== '') {
        payload.base_directory = config.base_directory;
      }

      if (config.publish_directory && config.publish_directory.trim() !== '') {
        payload.publish_directory = config.publish_directory;
      }

      if (isStatic) {
        payload.is_static = true;
      }

      // Límites de recursos del contenedor
      if (config.limits_memory) {
        payload.limits_memory = config.limits_memory;
      }
      if (config.limits_cpus) {
        payload.limits_cpus = config.limits_cpus;
      }

      // Dominios
      if (config.docker_compose_raw) {
        payload.docker_compose_raw = config.docker_compose_raw;
      }

      if (config.docker_compose_location) {
        payload.docker_compose_location = config.docker_compose_location;
      }

      if (config.docker_compose_domains) {
        // Para dockercompose: { "service_name": "http://domain.com:port" }
        payload.docker_compose_domains = config.docker_compose_domains;
      } else if (config.domains) {
        if (typeof config.domains === 'string' && config.domains.trim() !== '') {
          payload.domains = config.domains.trim();
        } else if (Array.isArray(config.domains) && config.domains.length > 0) {
          const firstDomain = config.domains.find(d => d && d.trim() !== '');
          if (firstDomain) {
            payload.domains = firstDomain.trim();
          }
        }
      }

      // IMPORTANTE: Limpiar TODOS los valores null, undefined y strings vacíos del payload
      // para evitar que Coolify los escriba en thegameplan.json
      const cleanPayload = this.cleanPayload(payload);

      console.log('🚀 Sending to Coolify:', JSON.stringify(cleanPayload, null, 2));

      const response = await this.api.post('/applications/public', cleanPayload);

      // Coolify devuelve { uuid: "..." } en el response
      const appId = response.data.uuid;

      // NOTA: Las variables de entorno se configuran en el controlador DESPUÉS de crear la app
      // usando el método updateEnvironmentVariables(), ya que el endpoint POST /applications/public
      // no acepta environment_variables en el payload inicial

      return {
        id: appId,
        name: config.name,
        status: 'pending',
        git_repository: config.git_repository,
        domains: config.domains || '', // Ahora domains es string (o puede ser array)
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
   * Actualizar configuración de una aplicación (límites de recursos, etc.)
   */
  async updateApplication(appId: string, config: Partial<CoolifyAppConfig>): Promise<void> {
    try {
      const payload = this.cleanPayload(config);
      await this.api.patch(`/applications/${appId}`, payload);
    } catch (error: any) {
      console.error('Error updating application in Coolify:', error.response?.data || error.message);
      throw new Error(`Failed to update application in Coolify: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Crear/Actualizar variables de entorno de una aplicación
   * NOTA: Coolify requiere un POST por cada variable para crearlas
   */
  async updateEnvironmentVariables(
    appId: string,
    variables: Record<string, string>
  ): Promise<void> {
    try {
      console.log(`📝 Enviando variables de entorno a Coolify para app ${appId}:`);

      // Coolify requiere enviar una variable a la vez usando POST para crear
      for (const [key, value] of Object.entries(variables)) {
        console.log(`  → ${key}=${value}`);
        const payload = {
          key,
          value,
          is_preview: false,
          is_literal: false,
          is_multiline: false,
          is_shown_once: false,
        };

        try {
          await this.api.post(`/applications/${appId}/envs`, payload);
          console.log(`  ✅ ${key} creada`);
        } catch (postError: any) {
          const msg = postError.response?.data?.message || postError.message || '';
          if (msg.toLowerCase().includes('already exists')) {
            // La variable ya existe — usar PATCH para actualizarla
            try {
              await this.api.patch(`/applications/${appId}/envs`, payload);
              console.log(`  ✅ ${key} actualizada (PATCH)`);
            } catch (patchError: any) {
              console.error(`  ❌ Error al actualizar ${key}:`, patchError.response?.data || patchError.message);
              throw patchError;
            }
          } else {
            console.error(`  ❌ Error al crear ${key}:`, postError.response?.data || postError.message);
            throw postError;
          }
        }
      }

      console.log(`✅ ${Object.keys(variables).length} variables de entorno configuradas en Coolify`);
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
      const response = await this.api.get('/deploy', {
        params: { uuid: appId },
      });

      // Coolify devuelve { deployments: [{ deployment_uuid, resource_uuid, message }] }
      const deploymentData = response.data.deployments?.[0];

      return {
        id: deploymentData?.deployment_uuid || appId,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        logs: deploymentData?.message || 'Deployment started',
      };
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
   * Obtener logs de runtime de una aplicación
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
   * Obtener el deployment más reciente de una aplicación en Coolify
   */
  async getLatestDeployment(appId: string): Promise<{ uuid: string; status: string } | null> {
    try {
      const response = await this.api.get(`/applications/${appId}/deployments`, {
        params: { take: 1 },
      });
      const deployments = response.data?.data ?? response.data;
      const first = Array.isArray(deployments) ? deployments[0] : null;
      if (!first) return null;
      return { uuid: first.deployment_uuid ?? first.uuid, status: first.status ?? '' };
    } catch (error: any) {
      console.error('Error fetching latest deployment:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Obtener los logs de build de un deployment específico de Coolify
   * Devuelve { logs, status } donde status indica si el deployment terminó
   */
  async getDeploymentLogs(deploymentUuid: string): Promise<{ logs: string; status: string }> {
    try {
      const response = await this.api.get(`/deployments/${deploymentUuid}`);
      return {
        logs: response.data.logs ?? '',
        status: response.data.status ?? '',
      };
    } catch (error: any) {
      console.error('Error fetching deployment logs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch deployment logs: ${error.response?.data?.message || error.message}`);
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

  /**
   * Limpiar payload recursivamente eliminando null, undefined y strings vacíos
   * Esto evita que Coolify escriba valores null en thegameplan.json
   */
  private cleanPayload(obj: any): any {
    if (Array.isArray(obj)) {
      return obj
        .map(item => this.cleanPayload(item))
        .filter(item => item !== null && item !== undefined && item !== '');
    }

    if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Saltar null, undefined y strings vacíos
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' && value.trim() === '') continue;

        // Limpiar recursivamente objetos y arrays
        if (typeof value === 'object') {
          const cleanedValue = this.cleanPayload(value);
          // Solo agregar si el objeto/array resultante no está vacío
          if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue;
          if (!Array.isArray(cleanedValue) && typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) continue;
          cleaned[key] = cleanedValue;
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }

    return obj;
  }
}

export default new CoolifyService();
