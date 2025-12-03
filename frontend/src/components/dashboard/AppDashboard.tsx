import { useState } from 'react';
import { Aplicacion, EstadoApp } from '@/types';
import { aplicacionService } from '@/services/aplicacion.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppDashboardProps {
  app: Aplicacion;
  onUpdate: () => void;
  onDelete: () => void;
}

export function AppDashboard({ app, onUpdate, onDelete }: AppDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (
    action: () => Promise<any>,
    successMessage: string
  ) => {
    setError('');
    setIsLoading(true);

    try {
      await action();
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || `Error: ${successMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = () => {
    handleAction(
      () => aplicacionService.deployAplicacion(),
      'Deployment iniciado'
    );
  };

  const handleStop = () => {
    handleAction(
      () => aplicacionService.stopAplicacion(),
      'Aplicación detenida'
    );
  };

  const handleRestart = () => {
    handleAction(
      () => aplicacionService.restartAplicacion(),
      'Aplicación reiniciada'
    );
  };

  const handleDelete = async () => {
    setError('');
    setIsLoading(true);

    try {
      await aplicacionService.deleteAplicacion();
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
      const response = await aplicacionService.getLogs(200);
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

  const canStart = app.estado === EstadoApp.STOPPED;
  const canStop = app.estado === EstadoApp.RUNNING;
  const canRestart = app.estado === EstadoApp.RUNNING;
  const canDeploy = [EstadoApp.RUNNING, EstadoApp.STOPPED, EstadoApp.FAILED].includes(
    app.estado
  );

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
            <Badge className={getEstadoColor(app.estado)}>
              {getEstadoText(app.estado)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            {canDeploy && (
              <Button onClick={handleDeploy} disabled={isLoading}>
                <Rocket className="h-4 w-4 mr-2" />
                {app.estado === EstadoApp.FAILED ? 'Reintentar Deploy' : 'Redeploy'}
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

            <Button
              onClick={handleViewLogs}
              disabled={isLoading}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {showLogs ? 'Ocultar Logs' : 'Ver Logs'}
            </Button>
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
          {app.variablesEntorno && Object.keys(app.variablesEntorno).length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Variables de Entorno</h4>
              <div className="bg-muted p-4 rounded-lg space-y-1">
                {Object.entries(app.variablesEntorno).map(([key, value]) => (
                  <div key={key} className="text-sm font-mono">
                    <span className="font-semibold">{key}</span> = {value}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    ¿Estás seguro? Esta acción no se puede deshacer. Tu aplicación será
                    eliminada permanentemente.
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
