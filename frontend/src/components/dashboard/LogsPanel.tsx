import { useEffect, useRef, useState } from 'react';
import { EstadoApp, TipoAplicacion } from '@/types';
import { aplicacionService, LogStreamEvent } from '@/services/aplicacion.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface LogsPanelProps {
  appId: string;
  appEstado: EstadoApp;
  tipoAplicacion: TipoAplicacion;
  onClose: () => void;
}

type LogMode = 'build' | 'runtime';

function initialMode(estado: EstadoApp): LogMode {
  return estado === EstadoApp.RUNNING ? 'runtime' : 'build';
}

export function LogsPanel({ appId, appEstado, tipoAplicacion, onClose }: LogsPanelProps) {
  const token = useAuthStore((s) => s.token) ?? '';
  const [mode, setMode] = useState<LogMode>(() => initialMode(appEstado));
  const [content, setContent] = useState('');
  const [streamDone, setStreamDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const prevEstadoRef = useRef(appEstado);

  // Auto-scroll al fondo cuando llegan logs nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  // Cuando el deploy termina y la app pasa a RUNNING, cambiar a runtime
  useEffect(() => {
    if (
      prevEstadoRef.current === EstadoApp.DEPLOYING &&
      appEstado === EstadoApp.RUNNING &&
      mode === 'build'
    ) {
      setMode('runtime');
    }
    prevEstadoRef.current = appEstado;
  }, [appEstado, mode]);

  // Iniciar / reiniciar stream cuando cambia modo o appId
  useEffect(() => {
    closeStreamRef.current?.();
    setContent('');
    setStreamDone(false);

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') {
        setContent((prev) => prev + e.content);
      } else if (e.type === 'done') {
        setStreamDone(true);
      } else if (e.type === 'error') {
        // Mostrar errores de conexión en el terminal, no silenciarlos
        setContent((prev) => prev + `\n[Error de conexión] ${e.content}\n`);
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

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') setContent((prev) => prev + e.content);
      else if (e.type === 'done') setStreamDone(true);
      else if (e.type === 'error') setContent((prev) => prev + `\n[Error de conexión] ${e.content}\n`);
    };

    closeStreamRef.current =
      mode === 'runtime'
        ? aplicacionService.streamRuntimeLogs(appId, token, onEvent)
        : aplicacionService.streamBuildLogs(appId, token, onEvent);
  };

  const isCompose = tipoAplicacion === TipoAplicacion.DOCKER_COMPOSE;

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 gap-2">
        <div className="flex items-center gap-2">
          {/* Tabs */}
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

          {/* Label compose */}
          {isCompose && mode === 'runtime' && (
            <span className="text-xs text-zinc-500 italic">todos los servicios</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Estado del stream */}
          {!streamDone ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Finalizado</span>
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

      {/* Terminal */}
      <pre className="bg-zinc-950 text-zinc-200 font-mono text-xs p-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words leading-5">
        {content || (
          <span className="text-zinc-500">
            {mode === 'build'
              ? 'Esperando logs de build...'
              : 'Esperando logs de runtime...'}
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
