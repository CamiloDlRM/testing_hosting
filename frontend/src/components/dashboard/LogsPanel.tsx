import { useEffect, useRef, useState } from 'react';
import { EstadoApp } from '@/types';
import { aplicacionService, LogStreamEvent } from '@/services/aplicacion.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface LogsPanelProps {
  appId: string;
  appEstado: EstadoApp;
  onClose: () => void;
}

type LogMode = 'build' | 'runtime';

export function LogsPanel({ appId, appEstado, onClose }: LogsPanelProps) {
  const token = useAuthStore((s) => s.token) ?? '';
  const [mode, setMode] = useState<LogMode>(() =>
    appEstado === EstadoApp.RUNNING ? 'runtime' : 'build'
  );
  const [content, setContent] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);

  // Auto-scroll al fondo cuando llega contenido nuevo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  // Iniciar / reiniciar el stream cuando cambia modo o appId
  useEffect(() => {
    // Limpiar stream anterior
    closeStreamRef.current?.();
    setContent('');
    setStreamDone(false);
    setConnectionError(false);

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') {
        setContent((prev) => prev + e.content);
      } else if (e.type === 'done') {
        setStreamDone(true);
      } else if (e.type === 'error') {
        setConnectionError(true);
      }
    };

    const stop =
      mode === 'runtime'
        ? aplicacionService.streamRuntimeLogs(appId, token, onEvent)
        : aplicacionService.streamBuildLogs(appId, token, onEvent);

    closeStreamRef.current = stop;

    return () => {
      stop();
      closeStreamRef.current = null;
    };
  }, [appId, mode, token]);

  const restart = () => {
    closeStreamRef.current?.();
    setContent('');
    setStreamDone(false);
    setConnectionError(false);

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') setContent((prev) => prev + e.content);
      else if (e.type === 'done') setStreamDone(true);
      else if (e.type === 'error') setConnectionError(true);
    };

    closeStreamRef.current =
      mode === 'runtime'
        ? aplicacionService.streamRuntimeLogs(appId, token, onEvent)
        : aplicacionService.streamBuildLogs(appId, token, onEvent);
  };

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('build')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'build'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Build
          </button>
          <button
            onClick={() => setMode('runtime')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'runtime'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Runtime
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador de estado */}
          {!streamDone && !connectionError && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
          {streamDone && (
            <span className="text-xs text-zinc-400">Stream finalizado</span>
          )}
          {connectionError && (
            <span className="text-xs text-amber-400">Reconectando...</span>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            onClick={restart}
            title="Reiniciar stream"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Área de logs */}
      <pre className="bg-zinc-950 text-zinc-200 font-mono text-xs p-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words leading-5">
        {content || (
          <span className="text-zinc-500">
            Esperando logs{mode === 'build' ? ' del build' : ' de runtime'}...
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
