import { Response } from 'express';
import * as yaml from 'js-yaml';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import coolifyService from '../services/coolify.service';

const RUNTIME_POLL_MS = 3000;
const BUILD_POLL_MS = 2000;
const HEARTBEAT_MS = 20000;

const TERMINAL_STATUSES = new Set(['finished', 'failed', 'error', 'cancelled']);

function setSseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sendEvent(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /aplicacion/:appId/logs/services
 * Devuelve la lista de servicios de una app Docker Compose.
 * Los extrae del docker_compose_raw guardado en Coolify.
 */
export const getComposeServices = async (
  req: AuthRequest<{ appId: string }>,
  res: Response
) => {
  const userId = req.user!.id;
  const { appId } = req.params;

  const app = await prisma.aplicacion.findFirst({
    where: { id: appId, userId },
    select: { coolifyAppId: true, tipoAplicacion: true },
  });

  if (!app?.coolifyAppId) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  if (app.tipoAplicacion !== 'DOCKER_COMPOSE') {
    return res.json({ success: true, data: [] });
  }

  try {
    const details = await coolifyService.getApplicationDetails(app.coolifyAppId);
    console.log('🔍 Coolify app details keys:', Object.keys(details ?? {}));

    let services: string[] = [];

    // Intentar extraer servicios de docker_compose_raw (YAML que enviamos nosotros)
    if (details?.docker_compose_raw) {
      try {
        const parsed: any = yaml.load(details.docker_compose_raw);
        services = Object.keys(parsed?.services ?? {});
      } catch { /* ignorar */ }
    }

    // Fallback: extraer de docker_compose_domains que enviamos al crear
    if (services.length === 0 && Array.isArray(details?.docker_compose_domains)) {
      services = details.docker_compose_domains.map((d: any) => d.name ?? d).filter(Boolean);
    }

    // Fallback 2: campo services directo que Coolify puede exponer
    if (services.length === 0 && Array.isArray(details?.services)) {
      services = details.services.map((s: any) => s.name ?? s).filter(Boolean);
    }

    console.log(`📋 Compose services para app ${appId}:`, services);
    return res.json({ success: true, data: services });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /aplicacion/:appId/logs/runtime/stream?service=nombre_servicio
 *
 * Si se pasa `service`, filtra los logs a ese contenedor específico.
 * Sin `service`, devuelve todos los logs del app (o del contenedor principal).
 */
export const streamRuntimeLogs = async (
  req: AuthRequest<{ appId: string }>,
  res: Response
) => {
  const userId = req.user!.id;
  const { appId } = req.params;
  const serviceName = req.query.service as string | undefined;

  const app = await prisma.aplicacion.findFirst({
    where: { id: appId, userId },
    select: { coolifyAppId: true, tipoAplicacion: true },
  });

  if (!app?.coolifyAppId) {
    res.status(404).json({ success: false, error: 'Application not found' });
    return;
  }

  setSseHeaders(res);

  let lastOffset = 0;
  let closed = false;

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const poll = setInterval(async () => {
    if (closed) return;
    try {
      const logs = await coolifyService.getApplicationLogs(app.coolifyAppId!, 500, serviceName);
      if (logs.length > lastOffset) {
        sendEvent(res, { type: 'log', content: logs.slice(lastOffset) });
        lastOffset = logs.length;
      }
    } catch {
      // Ignorar errores puntuales — el contenedor puede estar reiniciando
    }
  }, RUNTIME_POLL_MS);

  req.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(poll);
  });
};

/**
 * GET /aplicacion/:appId/logs/build/stream
 *
 * Estrategia:
 * 1. Conecta al WebSocket de Reverb de Coolify → channel `deployment.{uuid}`
 *    para recibir logs de build en tiempo real.
 * 2. Hace polling del status del deployment cada BUILD_POLL_MS para detectar
 *    cuándo termina (finished / failed / error / cancelled).
 * 3. Si el WS no conecta o no llegan eventos en WS_TIMEOUT_MS, cae en modo
 *    polling puro del endpoint REST (comportamiento anterior).
 */
const WS_TIMEOUT_MS = 6000; // si en este tiempo no llega ningún log por WS, usar fallback

export const streamBuildLogs = async (
  req: AuthRequest<{ appId: string }>,
  res: Response
) => {
  const userId = req.user!.id;
  const { appId } = req.params;

  const app = await prisma.aplicacion.findFirst({
    where: { id: appId, userId },
    select: { id: true, coolifyAppId: true },
  });

  if (!app?.coolifyAppId) {
    res.status(404).json({ success: false, error: 'Application not found' });
    return;
  }

  setSseHeaders(res);

  // ── 1. Resolver deployment UUID ────────────────────────────────────────────
  const dbDeployment = await prisma.deployment.findFirst({
    where: { aplicacionId: app.id },
    orderBy: { timestamp: 'desc' },
    select: { version: true },
  });

  const looksLikeCoolifyUuid = (v: string) =>
    !!v && v !== '1.0.0' && !v.match(/^\d{4}-\d{2}-\d{2}/) && v.length > 10;

  let deploymentUuid: string | null =
    dbDeployment?.version && looksLikeCoolifyUuid(dbDeployment.version)
      ? dbDeployment.version
      : null;

  if (deploymentUuid) {
    console.log(`✅ Build logs UUID de DB: ${deploymentUuid}`);
  } else {
    const latest = await coolifyService.getLatestDeployment(app.coolifyAppId);
    deploymentUuid = latest?.uuid ?? null;
    if (deploymentUuid) console.log(`✅ Build logs UUID de Coolify API: ${deploymentUuid}`);
  }

  if (!deploymentUuid) {
    sendEvent(res, { type: 'log', content: '[Error] No se encontró el deployment en Coolify.\n' });
    sendEvent(res, { type: 'done', status: 'error' });
    res.end();
    return;
  }

  // ── 2. Estado compartido ───────────────────────────────────────────────────
  let closed = false;
  let wsReceivedLog = false;
  let closeWs: (() => void) | null = null;
  let statusPoll: ReturnType<typeof setInterval> | null = null;
  let wsTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    closeWs?.();
    if (statusPoll) clearInterval(statusPoll);
    if (wsTimeoutTimer) clearTimeout(wsTimeoutTimer);
    res.end();
  };

  req.on('close', cleanup);

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const finalCleanup = () => {
    clearInterval(heartbeat);
    cleanup();
  };

  // ── 3. Poll de status (independiente del canal de logs) ────────────────────
  const startStatusPoll = (uuid: string) => {
    statusPoll = setInterval(async () => {
      if (closed) return;
      try {
        const { status } = await coolifyService.getDeploymentLogs(uuid);
        if (status && TERMINAL_STATUSES.has(status.toLowerCase())) {
          sendEvent(res, { type: 'done', status });
          finalCleanup();
        }
      } catch { /* ignorar errores puntuales */ }
    }, BUILD_POLL_MS);
  };

  // ── 4. Fallback: polling REST de logs (para versiones sin WS funcional) ────
  const startRestFallback = (uuid: string) => {
    console.warn(`⚠️ WS sin respuesta para ${uuid} — usando fallback REST`);
    sendEvent(res, {
      type: 'log',
      content: '[Conectando via REST fallback...]\n',
    });

    let lastOffset = 0;
    const poll = setInterval(async () => {
      if (closed) { clearInterval(poll); return; }
      try {
        const { logs, status } = await coolifyService.getDeploymentLogs(uuid);
        if (logs.length > lastOffset) {
          sendEvent(res, { type: 'log', content: logs.slice(lastOffset) });
          lastOffset = logs.length;
        }
        if (status && TERMINAL_STATUSES.has(status.toLowerCase())) {
          sendEvent(res, { type: 'done', status });
          clearInterval(poll);
          finalCleanup();
        }
      } catch (err: any) {
        console.error('Build logs REST poll error:', err.message);
      }
    }, BUILD_POLL_MS);
  };

  // ── 5. Conectar al WebSocket de Reverb ────────────────────────────────────
  closeWs = coolifyService.connectToBuildLogStream(
    deploymentUuid,
    // onLog
    (line) => {
      if (closed) return;
      wsReceivedLog = true;
      if (wsTimeoutTimer) { clearTimeout(wsTimeoutTimer); wsTimeoutTimer = null; }
      sendEvent(res, { type: 'log', content: line });
    },
    // onConnected
    () => {
      if (closed) return;
      // Cancelar el timeout de fallback: la suscripción fue confirmada
      if (wsTimeoutTimer) { clearTimeout(wsTimeoutTimer); wsTimeoutTimer = null; }
      startStatusPoll(deploymentUuid!);
    },
    // onClose (el WS se cerró solo — Coolify cierra el channel cuando termina el build)
    () => {
      if (closed) return;
      // Si el WS se cerró sin haber emitido logs, usar fallback
      if (!wsReceivedLog) {
        startRestFallback(deploymentUuid!);
        return;
      }
      // Si ya habíamos recibido logs, el build terminó — obtener status final
      coolifyService.getDeploymentLogs(deploymentUuid!).then(({ status }) => {
        if (!closed) {
          sendEvent(res, { type: 'done', status: status || 'finished' });
          finalCleanup();
        }
      }).catch(finalCleanup);
    },
  );

  // Si en WS_TIMEOUT_MS no llegó ningún log ni confirmación de suscripción, usar fallback
  wsTimeoutTimer = setTimeout(() => {
    if (!closed && !wsReceivedLog) {
      closeWs?.();
      startRestFallback(deploymentUuid!);
      startStatusPoll(deploymentUuid!);
    }
  }, WS_TIMEOUT_MS);
};
