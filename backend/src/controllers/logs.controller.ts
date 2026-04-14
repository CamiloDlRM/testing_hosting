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
    } catch (err: any) {
      console.error('Runtime logs poll error:', err.message);
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
 * Obtiene el Coolify deployment_uuid con esta prioridad:
 * 1. Campo `version` del último Deployment en nuestra DB (lo guardamos al deployar).
 * 2. Fallback: GET /applications/{uuid}/deployments de Coolify.
 * 3. Reintentar hasta MAX_RETRIES veces si aún no apareció el deployment.
 */
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

  // 1. Buscar en nuestra DB — `version` guarda el deployment_uuid desde que lo almacenamos
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
    // 2. Fallback: API de Coolify
    const latest = await coolifyService.getLatestDeployment(app.coolifyAppId);
    deploymentUuid = latest?.uuid ?? null;
    if (deploymentUuid) console.log(`✅ Build logs UUID de Coolify API: ${deploymentUuid}`);
  }

  const MAX_RETRIES = 8;
  let retries = 0;
  let lastOffset = 0;
  let closed = false;

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const poll = setInterval(async () => {
    if (closed) return;

    if (!deploymentUuid) {
      retries++;
      if (retries > MAX_RETRIES) {
        sendEvent(res, {
          type: 'log',
          content: '[Error] No se encontró el deployment en Coolify. Intenta recargar el panel.\n',
        });
        sendEvent(res, { type: 'done', status: 'error' });
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        res.end();
        return;
      }
      const latest = await coolifyService.getLatestDeployment(app.coolifyAppId!);
      if (latest?.uuid) {
        deploymentUuid = latest.uuid;
      } else {
        sendEvent(res, { type: 'log', content: `[Buscando deployment... ${retries}/${MAX_RETRIES}]\n` });
      }
      return;
    }

    try {
      const { logs, status } = await coolifyService.getDeploymentLogs(deploymentUuid);

      if (logs.length > lastOffset) {
        sendEvent(res, { type: 'log', content: logs.slice(lastOffset) });
        lastOffset = logs.length;
      }

      if (status && TERMINAL_STATUSES.has(status.toLowerCase())) {
        sendEvent(res, { type: 'done', status });
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        res.end();
      }
    } catch (err: any) {
      console.error('Build logs poll error:', err.message);
    }
  }, BUILD_POLL_MS);

  req.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(poll);
  });
};
