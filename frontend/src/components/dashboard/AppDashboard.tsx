import { useState, useEffect, useRef, useCallback } from 'react';
import { Aplicacion, EstadoApp } from '@/types';
import { aplicacionService } from '@/services/aplicacion.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { getEstadoColor, getEstadoText } from '@/lib/utils';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  GitBranch,
  AlertCircle,
  Rocket,
  FileText,
  ExternalLink,
  Globe,
  Copy,
  Pencil,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppDashboardProps {
  app: Aplicacion;
  onUpdate: () => void;
  onSilentUpdate: () => void;
  onDelete: () => void;
}

const POLLING_INTERVAL = 5000;

export function AppDashboard({ app, onUpdate, onSilentUpdate, onDelete }: AppDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Env var editing state
  const [editingEnvVars, setEditingEnvVars] = useState(false);
  const [envVarPairs, setEnvVarPairs] = useState<{ key: string; value: string }[]>([]);
  const [savingEnvVars, setSavingEnvVars] = useState(false);
  const [needsRedeploy, setNeedsRedeploy] = useState(false);

  const hasActiveDeployment = app.deployments?.some((d) => d.estado === 'IN_PROGRESS') ?? false;
  const isDeploying =
    app.estado === EstadoApp.PENDING ||
    app.estado === EstadoApp.DEPLOYING ||
    hasActiveDeployment;

  const onSilentUpdateRef = useRef(onSilentUpdate);
  onSilentUpdateRef.current = onSilentUpdate;

  // Polling temporal después de acciones (stop/start/restart/deploy)
  const [pollAfterAction, setPollAfterAction] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerActionPolling = useCallback(() => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    setPollAfterAction(true);
    pollTimeoutRef.current = setTimeout(() => setPollAfterAction(false), 60_000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Polling: mientras deploying O en ventana post-acción
  useEffect(() => {
    if (!isDeploying && !pollAfterAction) return;
    const interval = setInterval(() => {
      onSilentUpdateRef.current();
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [isDeploying, pollAfterAction]);

  const copyDomainToClipboard = () => {
    if (app.dominio) {
      navigator.clipboard.writeText(`https://${app.dominio}`);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleAction = async (action: () => Promise<any>, successMessage: string) => {
    setError('');
    setIsLoading(true);
    try {
      await action();
      triggerActionPolling();
    } catch (err: any) {
      setError(err.response?.data?.error || `Error: ${successMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = () => {
    setNeedsRedeploy(false);
    handleAction(() => aplicacionService.deployAplicacion(app.id), 'Deployment iniciado');
  };

  const handleStop = () =>
    handleAction(() => aplicacionService.stopAplicacion(app.id), 'Aplicación detenida');

  const handleRestart = () =>
    handleAction(() => aplicacionService.restartAplicacion(app.id), 'Aplicación reiniciada');

  const handleDelete = async () => {
    setError('');
    setIsLoading(true);
    try {
      await aplicacionService.deleteAplicacion(app.id);
      onDelete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar la aplicación');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleViewLogs = async () => {
    if (showLogs) {
      setShowLogs(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await aplicacionService.getLogs(app.id, 200);
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setShowLogs(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al obtener logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Env var editing
  const startEditEnvVars = () => {
    const pairs = app.variablesEntorno
      ? Object.entries(app.variablesEntorno).map(([key, value]) => ({ key, value }))
      : [];
    if (pairs.length === 0) pairs.push({ key: '', value: '' });
    setEnvVarPairs(pairs);
    setEditingEnvVars(true);
  };

  const cancelEditEnvVars = () => {
    setEditingEnvVars(false);
    setEnvVarPairs([]);
  };

  const saveEnvVars = async () => {
    setSavingEnvVars(true);
    setError('');
    try {
      const vars: Record<string, string> = {};
      for (const { key, value } of envVarPairs) {
        if (key.trim()) vars[key.trim()] = value;
      }
      await aplicacionService.updateAplicacion(app.id, { variablesEntorno: vars });
      setEditingEnvVars(false);
      setNeedsRedeploy(true);
      onSilentUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar las variables de entorno');
    } finally {
      setSavingEnvVars(false);
    }
  };

  const updateEnvPair = (index: number, field: 'key' | 'value', val: string) => {
    setEnvVarPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)));
  };

  const addEnvPair = () => setEnvVarPairs((prev) => [...prev, { key: '', value: '' }]);

  const removeEnvPair = (index: number) =>
    setEnvVarPairs((prev) => prev.filter((_, i) => i !== index));

  const canStart = app.estado === EstadoApp.STOPPED && !needsRedeploy;
  const canStop = app.estado === EstadoApp.RUNNING && !needsRedeploy;
  const canRestart = app.estado === EstadoApp.RUNNING && !needsRedeploy;
  const canDeploy = [EstadoApp.RUNNING, EstadoApp.STOPPED, EstadoApp.FAILED].includes(app.estado);
  const canViewLogs = !needsRedeploy;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{app.nombre}</CardTitle>
              <CardDescription className="flex items-center mt-2">
                <GitBranch className="h-4 w-4 mr-2" />
                {app.repositorioGit}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDeploying && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Actualizando...
                </span>
              )}
              <Badge className={getEstadoColor(app.estado)}>{getEstadoText(app.estado)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* URL de la Aplicación */}
          {app.dominio && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-900">URL de tu aplicación</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-4 py-2 rounded border border-purple-200 text-purple-900 font-mono text-sm">
                  https://{app.dominio}
                </code>
                <Button
                  onClick={copyDomainToClipboard}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 hover:bg-purple-100"
                >
                  {copiedDomain ? (
                    <span className="text-green-600">✓ Copiado</span>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.open(`https://${app.dominio}`, '_blank')}
                  variant="default"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={app.estado !== EstadoApp.RUNNING}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
              </div>
              {app.estado !== EstadoApp.RUNNING && (
                <p className="text-xs text-purple-600 mt-2">
                  ℹ️ La aplicación debe estar en estado RUNNING para poder acceder
                </p>
              )}
            </div>
          )}

          {/* Información de la aplicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Creada</p>
              <p className="font-medium">
                {format(new Date(app.createdAt), "PPP 'a las' p", { locale: es })}
              </p>
            </div>
            {app.ultimoDeployment && (
              <div>
                <p className="text-sm text-muted-foreground">Último Deployment</p>
                <p className="font-medium">
                  {format(new Date(app.ultimoDeployment), "PPP 'a las' p", { locale: es })}
                </p>
              </div>
            )}
          </div>

          {/* Configuración de Deployment */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">⚙️ Configuración</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Rama</p>
                <p className="font-medium">{app.ramaBranch || 'main'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {app.tipoAplicacion === 'STATIC' && '📄 Static Site'}
                  {app.tipoAplicacion === 'NIXPACKS' && '🔄 Auto-detect'}
                  {app.tipoAplicacion === 'DOCKERFILE' && '🐳 Dockerfile'}
                  {app.tipoAplicacion === 'DOCKER_COMPOSE' && '🐙 Docker Compose'}
                </p>
              </div>
              {app.tipoAplicacion !== 'STATIC' && (
                <div>
                  <p className="text-muted-foreground">Puerto</p>
                  <p className="font-medium">{app.puerto}</p>
                </div>
              )}
              {app.buildCommand && (
                <div>
                  <p className="text-muted-foreground">Build Command</p>
                  <p className="font-mono text-xs">{app.buildCommand}</p>
                </div>
              )}
              {app.startCommand && (
                <div>
                  <p className="text-muted-foreground">Start Command</p>
                  <p className="font-mono text-xs">{app.startCommand}</p>
                </div>
              )}
              {app.publishDirectory && (
                <div>
                  <p className="text-muted-foreground">Publish Directory</p>
                  <p className="font-mono text-xs">{app.publishDirectory}</p>
                </div>
              )}
              {app.baseDirectory && (
                <div>
                  <p className="text-muted-foreground">Base Directory</p>
                  <p className="font-mono text-xs">{app.baseDirectory}</p>
                </div>
              )}
            </div>
          </div>

          {/* Alert: redeploy requerido tras cambio de variables */}
          {needsRedeploy && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Redeploy requerido.</strong> Las variables de entorno fueron actualizadas.
                Para que los cambios tomen efecto debes hacer un redeploy. Los demás controles
                están bloqueados hasta entonces.
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            {canDeploy && (
              <Button onClick={handleDeploy} disabled={isLoading}>
                <Rocket className="h-4 w-4 mr-2" />
                {needsRedeploy ? 'Redeploy (requerido)' : app.estado === EstadoApp.FAILED ? 'Reintentar Deploy' : 'Redeploy'}
              </Button>
            )}
            {canStart && (
              <Button onClick={handleRestart} disabled={isLoading} variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            )}
            {canStop && (
              <Button onClick={handleStop} disabled={isLoading} variant="outline">
                <Square className="h-4 w-4 mr-2" />
                Detener
              </Button>
            )}
            {canRestart && (
              <Button onClick={handleRestart} disabled={isLoading} variant="outline">
                <RotateCw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
            )}
            {canViewLogs && (
              <Button onClick={handleViewLogs} disabled={isLoading} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                {showLogs ? 'Ocultar Logs' : 'Ver Logs'}
              </Button>
            )}
          </div>

          {/* Logs */}
          {showLogs && (
            <div className="mt-4">
              <pre className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                {logs || 'No hay logs disponibles'}
              </pre>
            </div>
          )}

          {/* Variables de Entorno */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Variables de Entorno</h4>
              {!editingEnvVars && (
                <Button onClick={startEditEnvVars} variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>

            {editingEnvVars ? (
              <div className="space-y-3">
                {envVarPairs.map((pair, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="VARIABLE"
                      value={pair.key}
                      onChange={(e) => updateEnvPair(index, 'key', e.target.value)}
                      className="font-mono text-sm flex-1"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      placeholder="valor"
                      value={pair.value}
                      onChange={(e) => updateEnvPair(index, 'value', e.target.value)}
                      className="font-mono text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvPair(index)}
                      disabled={envVarPairs.length === 1}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addEnvPair}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Agregar variable
                </Button>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveEnvVars} disabled={savingEnvVars}>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {savingEnvVars ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditEnvVars}
                    disabled={savingEnvVars}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : app.variablesEntorno && Object.keys(app.variablesEntorno).length > 0 ? (
              <div className="bg-muted p-4 rounded-lg space-y-1">
                {Object.entries(app.variablesEntorno).map(([key, value]) => (
                  <div key={key} className="text-sm font-mono">
                    <span className="font-semibold">{key}</span> = {value}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay variables de entorno configuradas.
              </p>
            )}
          </div>

          {/* Deployments Recientes */}
          {app.deployments && app.deployments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Deployments Recientes</h4>
              <div className="space-y-2">
                {app.deployments.slice(0, 5).map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{deployment.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deployment.timestamp), 'PPP p', { locale: es })}
                      </p>
                    </div>
                    <Badge className={getEstadoColor(deployment.estado)}>
                      {getEstadoText(deployment.estado)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zona Peligrosa */}
          <div className="border-t pt-6">
            <h4 className="font-semibold text-destructive mb-2">Zona Peligrosa</h4>
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Aplicación
              </Button>
            ) : (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ¿Estás seguro? Esta acción no se puede deshacer. Tu aplicación será eliminada
                    permanentemente.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button onClick={handleDelete} variant="destructive" disabled={isLoading}>
                    Sí, Eliminar Permanentemente
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
