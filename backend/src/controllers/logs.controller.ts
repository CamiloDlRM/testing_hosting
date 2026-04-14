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
  // Evita que nginx bufferice la respuesta
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sendEvent(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /aplicacion/:appId/logs/runtime/stream
 * Stream de logs de runtime (contenedor corriendo).
 * Pollea Coolify cada RUNTIME_POLL_MS y envía solo las líneas nuevas.
 */
export const streamRuntimeLogs = async (
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

  let lastOffset = 0;
  let closed = false;

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const poll = setInterval(async () => {
    if (closed) return;
    try {
      const logs = await coolifyService.getApplicationLogs(app.coolifyAppId!, 500);
      if (logs.length > lastOffset) {
        const newContent = logs.slice(lastOffset);
        lastOffset = logs.length;
        sendEvent(res, { type: 'log', content: newContent });
      }
    } catch {
      // Si falla un poll no cortamos el stream, lo intentamos de nuevo
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
 * Stream de logs de build del deployment más reciente.
 * Pollea Coolify cada BUILD_POLL_MS y cierra el stream cuando el deployment termina.
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

  // Obtener el deployment más reciente de Coolify
  const latest = await coolifyService.getLatestDeployment(app.coolifyAppId);
  if (!latest) {
    sendEvent(res, { type: 'error', content: 'No deployment found for this application.' });
    res.end();
    return;
  }

  const deploymentUuid = latest.uuid;
  let lastOffset = 0;
  let closed = false;

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  const poll = setInterval(async () => {
    if (closed) return;
    try {
      const { logs, status } = await coolifyService.getDeploymentLogs(deploymentUuid);

      if (logs.length > lastOffset) {
        const newContent = logs.slice(lastOffset);
        lastOffset = logs.length;
        sendEvent(res, { type: 'log', content: newContent });
      }

      if (TERMINAL_STATUSES.has(status.toLowerCase())) {
        sendEvent(res, { type: 'done', status });
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        res.end();
      }
    } catch {
      // Silenciamos errores de poll individuales
    }
  }, BUILD_POLL_MS);

  req.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(poll);
  });
};
