import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
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
   * Obtener logs de runtime de una aplicación (o de un contenedor específico de compose)
   */
  async getApplicationLogs(appId: string, lines: number = 100, containerName?: string): Promise<string> {
    try {
      const params: any = { lines };
      if (containerName) params.container_name = containerName;
      const response = await this.api.get(`/applications/${appId}/logs`, { params });
      return response.data.logs || '';
    } catch (error: any) {
      const msg: string = error.response?.data?.message || error.message || '';
      // Si el contenedor no está corriendo simplemente devolvemos vacío — no es un error fatal
      if (msg.toLowerCase().includes('not running') || msg.toLowerCase().includes('no container')) {
        return '';
      }
      console.error('Error fetching logs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch logs: ${msg}`);
    }
  }

  /**
   * Obtener detalles completos de una aplicación (incluye docker_compose_domains, etc.)
   */
  async getApplicationDetails(appId: string): Promise<any> {
    try {
      const response = await this.api.get(`/applications/${appId}`);
      const data = response.data;
      // Log campos relevantes para compose
      console.log(`🔍 getApplicationDetails ${appId}:`,
        `build_pack=${data?.build_pack}`,
        `| docker_compose_raw=${data?.docker_compose_raw ? '[presente, ' + String(data.docker_compose_raw).length + ' chars]' : 'AUSENTE'}`,
        `| docker_compose_domains=${JSON.stringify(data?.docker_compose_domains ?? 'AUSENTE')}`,
        `| docker_compose_location=${data?.docker_compose_location ?? 'AUSENTE'}`
      );
      return data;
    } catch (error: any) {
      console.error('Error fetching application details:', error.response?.data || error.message);
      return null;
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
      // Coolify puede devolver { data: [...] } o directamente [...]
      const raw = response.data;
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      console.log(`📋 Deployments para app ${appId}:`, JSON.stringify(list[0] ?? null));
      const first = list[0] ?? null;
      if (!first) return null;
      const uuid = first.deployment_uuid ?? first.uuid ?? first.id ?? null;
      if (!uuid) {
        console.warn('⚠️ Deployment encontrado pero sin UUID:', first);
        return null;
      }
      return { uuid, status: first.status ?? '' };
    } catch (error: any) {
      console.error('Error fetching latest deployment:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Obtener los logs de build de un deployment específico de Coolify.
   *
   * Coolify separa el objeto del deployment (metadata) de su contenido de logs:
   * - GET /deployments/{uuid}        → { status, commit, ... } — sin el log completo
   * - GET /deployments/{uuid}/logs   → el log de build en texto plano o JSON
   *
   * Intentamos ambos endpoints y nos quedamos con el que devuelva contenido.
   */
  async getDeploymentLogs(deploymentUuid: string): Promise<{ logs: string; status: string; coolifyDashboardUrl?: string }> {
    // 1. Obtener el status y metadata del deployment
    let status = '';
    let coolifyDashboardUrl: string | undefined;
    let metaData: any = null;
    try {
      const metaResp = await this.api.get(`/deployments/${deploymentUuid}`);
      metaData = metaResp.data;
      status = metaData.status ?? '';

      // deployment_url es una ruta relativa al frontend de Coolify (p.ej. /project/.../deployment/...)
      // Construir la URL completa combinando la base de la API (sin /api/v1) con esa ruta
      const relativeUiPath: string | null = metaData.deployment_url ?? null;
      if (relativeUiPath) {
        const apiBase: string = (this.api.defaults.baseURL ?? '').replace(/\/api\/v1\/?$/, '');
        coolifyDashboardUrl = apiBase + relativeUiPath;
      }

      console.log(
        `📄 Deployment ${deploymentUuid} status: ${status}`,
        `| coolifyDashboardUrl: ${coolifyDashboardUrl ?? 'N/A'}`
      );
    } catch (err: any) {
      console.error('Error fetching deployment metadata:', err.response?.data || err.message);
    }

    // 2. Intentar obtener el contenido del log desde el endpoint REST dedicado
    //    (solo existe en versiones recientes de Coolify; puede devolver 404)
    let logsStr = '';
    try {
      const logsResp = await this.api.get(`/deployments/${deploymentUuid}/logs`);
      const raw = logsResp.data;
      if (typeof raw === 'string') {
        logsStr = raw;
      } else if (Array.isArray(raw)) {
        logsStr = raw
          .map((e: any) => typeof e === 'string' ? e : (e?.output ?? e?.message ?? e?.log ?? JSON.stringify(e)))
          .join('');
      } else if (raw && typeof raw === 'object') {
        const candidate: any = raw.logs ?? raw.log ?? raw.output ?? raw.data ?? '';
        if (typeof candidate === 'string') logsStr = candidate;
        else if (Array.isArray(candidate))
          logsStr = candidate.map((e: any) => typeof e === 'string' ? e : (e?.output ?? JSON.stringify(e))).join('');
      }
    } catch (err: any) {
      console.warn(`⚠️ /deployments/${deploymentUuid}/logs no disponible (${err.response?.status ?? err.message}) — versión de Coolify sin endpoint REST de logs`);
    }

    // 3. Como último recurso, revisar si el objeto metadata tiene el log inline
    if (!logsStr && metaData) {
      const raw = metaData.logs ?? metaData.log ?? metaData.output ?? metaData.deployment_logs ?? '';
      if (typeof raw === 'string') logsStr = raw;
      else if (Array.isArray(raw))
        logsStr = raw.map((e: any) => typeof e === 'string' ? e : (e?.output ?? JSON.stringify(e))).join('');
    }

    return { logs: logsStr, status, coolifyDashboardUrl };
  }

  /**
   * Obtiene solo el status de un deployment (1 sola llamada API, sin intentar los logs).
   * Útil para polls de status sin saturar el rate limit de Coolify.
   */
  async getDeploymentStatusOnly(deploymentUuid: string): Promise<string> {
    try {
      const response = await this.api.get(`/deployments/${deploymentUuid}`);
      return response.data?.status ?? '';
    } catch (error: any) {
      console.error('Error fetching deployment status:', error.response?.data || error.message);
      return '';
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
   * Conecta al WebSocket de Reverb de Coolify (protocolo Pusher) y se suscribe
   * al channel `deployment.{deploymentUuid}` para recibir logs de build en tiempo real.
   *
   * Devuelve una función para cerrar la conexión manualmente.
   *
   * Callbacks:
   *   onLog(line)    — cada línea de log recibida
   *   onConnected()  — cuando la suscripción al channel fue confirmada
   *   onClose()      — cuando el WS se cierra (por error o porque Coolify terminó)
   */
  connectToBuildLogStream(
    deploymentUuid: string,
    onLog: (line: string) => void,
    onConnected: () => void,
    onClose: () => void,
  ): () => void {
    // COOLIFY_REVERB_HOST puede ser distinto al host de la API (ej: realtime.roblehosting.site)
    const reverbHost = process.env.COOLIFY_REVERB_HOST
      ?? (this.api.defaults.baseURL ?? '').replace(/\/api\/v1\/?$/, '').replace(/^https?:\/\//, '');
    const appKey = process.env.COOLIFY_REVERB_APP_KEY ?? 'coolify';
    const wsUrl = `wss://${reverbHost}/app/${appKey}?protocol=7&client=js&version=8.3.0&flash=false`;

    console.log(`🔌 Conectando WS Reverb: ${wsUrl} → channel deployment.${deploymentUuid}`);

    const ws = new WebSocket(wsUrl);
    let closed = false;

    const close = () => {
      if (!closed) {
        closed = true;
        ws.close();
      }
    };

    ws.on('open', () => {
      console.log(`🔌 WS abierto para deployment ${deploymentUuid}`);
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Mantener la conexión viva
        if (msg.event === 'pusher:ping') {
          ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
          return;
        }

        // Una vez establecida la conexión, suscribirse al channel
        if (msg.event === 'pusher:connection_established') {
          ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `deployment.${deploymentUuid}` },
          }));
          return;
        }

        // Suscripción confirmada
        if (msg.event === 'pusher-internal:subscription_succeeded') {
          console.log(`✅ Suscrito al channel deployment.${deploymentUuid}`);
          onConnected();
          return;
        }

        // Log de build — Coolify emite este evento con el output de cada paso
        if (
          msg.event === 'App\\Events\\DeploymentOutput' ||
          msg.event === 'DeploymentOutput'
        ) {
          const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          const line: string = data?.output ?? data?.log ?? data?.message ?? '';
          if (line) onLog(line);
          return;
        }
      } catch {
        // Ignorar mensajes mal formados
      }
    });

    ws.on('close', () => {
      if (!closed) {
        closed = true;
        console.log(`🔌 WS cerrado para deployment ${deploymentUuid}`);
        onClose();
      }
    });

    ws.on('error', (err: Error) => {
      console.error(`❌ WS error deployment ${deploymentUuid}:`, err.message);
      if (!closed) {
        closed = true;
        onClose();
      }
    });

    return close;
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
