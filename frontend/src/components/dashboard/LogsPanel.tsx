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
  const isCompose = tipoAplicacion === TipoAplicacion.DOCKER_COMPOSE;

  const [mode, setMode] = useState<LogMode>(() => initialMode(appEstado));
  // Servicio seleccionado para compose runtime logs. '' = sin filtro (todos)
  const [composeServices, setComposeServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');

  const [content, setContent] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [coolifyLink, setCoolifyLink] = useState<{ url: string; message: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const prevEstadoRef = useRef(appEstado);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  // Cargar servicios compose cuando entra en modo runtime
  useEffect(() => {
    if (!isCompose || mode !== 'runtime') return;
    aplicacionService.getComposeServices(appId).then((services) => {
      setComposeServices(services);
      // Si hay servicios y ninguno seleccionado, no preseleccionar (mostrar todos por defecto)
    });
  }, [appId, isCompose, mode]);

  // Auto-switch build → runtime cuando la app termina de deployar
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

  // Iniciar / reiniciar stream cuando cambia modo, servicio o appId
  useEffect(() => {
    closeStreamRef.current?.();
    setContent('');
    setStreamDone(false);
    setCoolifyLink(null);

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') {
        setContent((prev) => prev + e.content);
      } else if (e.type === 'done') {
        setStreamDone(true);
      } else if (e.type === 'error') {
        setContent((prev) => prev + `\n[Error de conexión] ${e.content}\n`);
      } else if (e.type === 'coolify_link') {
        setCoolifyLink({ url: e.url, message: e.content });
        setStreamDone(true);
      }
    };

    const stop =
      mode === 'runtime'
        ? aplicacionService.streamRuntimeLogs(
            appId,
            token,
            onEvent,
            isCompose && selectedService ? selectedService : undefined
          )
        : aplicacionService.streamBuildLogs(appId, token, onEvent);

    closeStreamRef.current = stop;
    return () => { stop(); closeStreamRef.current = null; };
  }, [appId, mode, token, selectedService, isCompose]);

  const restart = () => {
    closeStreamRef.current?.();
    setContent('');
    setStreamDone(false);
    setCoolifyLink(null);

    const onEvent = (e: LogStreamEvent) => {
      if (e.type === 'log') setContent((prev) => prev + e.content);
      else if (e.type === 'done') setStreamDone(true);
      else if (e.type === 'error') setContent((prev) => prev + `\n[Error de conexión] ${e.content}\n`);
      else if (e.type === 'coolify_link') { setCoolifyLink({ url: e.url, message: e.content }); setStreamDone(true); }
    };

    closeStreamRef.current =
      mode === 'runtime'
        ? aplicacionService.streamRuntimeLogs(
            appId, token, onEvent,
            isCompose && selectedService ? selectedService : undefined
          )
        : aplicacionService.streamBuildLogs(appId, token, onEvent);
  };

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-0">
        {/* Fila 1: tabs Build/Runtime + controles */}
        <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode('build')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'build' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Build
            </button>
            <button
              onClick={() => setMode('runtime')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'runtime' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Runtime
            </button>
          </div>

          <div className="flex items-center gap-2">
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
            <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white"
              onClick={restart} title="Reiniciar stream">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white"
              onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Fila 2: tabs de servicios compose (solo en modo runtime y si hay servicios) */}
        {isCompose && mode === 'runtime' && composeServices.length > 0 && (
          <div className="flex items-center gap-1 bg-zinc-800 px-4 py-1.5 border-t border-zinc-700">
            <span className="text-xs text-zinc-500 mr-1">Servicio:</span>
            <button
              onClick={() => setSelectedService('')}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                selectedService === ''
                  ? 'bg-zinc-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              todos
            </button>
            {composeServices.map((svc) => (
              <button
                key={svc}
                onClick={() => setSelectedService(svc)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                  selectedService === svc
                    ? 'bg-zinc-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {svc}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coolify fallback banner (build logs not available via REST) */}
      {coolifyLink && (
        <div className="flex items-start gap-3 bg-zinc-800 border-t border-zinc-700 px-4 py-3 text-xs">
          <span className="text-zinc-400 leading-5">{coolifyLink.message}</span>
          <a
            href={coolifyLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
          >
            Ver en Coolify →
          </a>
        </div>
      )}

      {/* Terminal */}
      <pre className="bg-zinc-950 text-zinc-200 font-mono text-xs p-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words leading-5">
        {content || (
          <span className="text-zinc-500">
            {mode === 'build' ? 'Esperando logs de build...' : 'Esperando logs de runtime...'}
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
