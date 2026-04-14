import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import coolifyService from '../services/coolify.service';

const RUNTIME_POLL_MS = 3000;
const BUILD_POLL_MS = 2000;
const HEARTBEAT_MS = 20000;

// Estados de Coolify que indican que el deployment terminó
const TERMINAL_STATUSES = new Set(['finished', 'failed', 'error', 'cancelled']);

function setSseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Evita buffering en nginx
  res.flushHeaders();
}

function sendEvent(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /aplicacion/:appId/logs/runtime/stream
 * Stream de logs de runtime — agrega todos los contenedores del app (o compose).
 */
export const streamRuntimeLogs = async (
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
      // lines=500 trae suficiente contexto; Coolify agrega todos los contenedores del compose
      const logs = await coolifyService.getApplicationLogs(app.coolifyAppId!, 500);
      if (logs.length > lastOffset) {
        const newContent = logs.slice(lastOffset);
        lastOffset = logs.length;
        sendEvent(res, { type: 'log', content: newContent });
      }
    } catch (err: any) {
      // No cortamos el stream — simplemente no enviamos nada este ciclo
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
 * Stream de logs del deployment más reciente.
 * Reintenta obtener el deployment hasta MAX_DEPLOYMENT_RETRIES veces (útil si el
 * deploy acaba de iniciarse y Coolify aún no lo registró).
 * Se cierra automáticamente cuando el deployment termina.
 */
export const streamBuildLogs = async (
  req: AuthRequest<{ appId: string }>,
  res: Response
) => {
  const userId = req.user!.id;
  const { appId } = req.params;

  const app = await prisma.aplicacion.findFirst({
    where: { id: appId, userId },
    select: { coolifyAppId: true },
  });

  if (!app?.coolifyAppId) {
    res.status(404).json({ success: false, error: 'Application not found' });
    return;
  }

  setSseHeaders(res);

  // Reintentar hasta 10 veces con 2s de espera entre intentos (~20s total)
  // antes de rendirse buscando el deployment.
  const MAX_RETRIES = 10;
  let deploymentUuid: string | null = null;
  let retries = 0;

  const tryFindDeployment = async (): Promise<boolean> => {
    const latest = await coolifyService.getLatestDeployment(app.coolifyAppId!);
    if (latest?.uuid) {
      deploymentUuid = latest.uuid;
      return true;
    }
    return false;
  };

  // Primer intento inmediato
  await tryFindDeployment();

  let lastOffset = 0;
  let closed = false;

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const poll = setInterval(async () => {
    if (closed) return;

    // Si aún no tenemos UUID, reintentar
    if (!deploymentUuid) {
      retries++;
      if (retries > MAX_RETRIES) {
        sendEvent(res, {
          type: 'log',
          content: '[Error] No se encontró ningún deployment en Coolify. Verifica que el deploy se haya iniciado correctamente.\n',
        });
        sendEvent(res, { type: 'done', status: 'error' });
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        res.end();
        return;
      }
      sendEvent(res, { type: 'log', content: `[Buscando deployment... intento ${retries}/${MAX_RETRIES}]\n` });
      await tryFindDeployment();
      return;
    }

    try {
      const { logs, status } = await coolifyService.getDeploymentLogs(deploymentUuid);

      if (logs.length > lastOffset) {
        const newContent = logs.slice(lastOffset);
        lastOffset = logs.length;
        sendEvent(res, { type: 'log', content: newContent });
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
      // No cortamos el stream por un fallo puntual
    }
  }, BUILD_POLL_MS);

  req.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(poll);
  });
};
