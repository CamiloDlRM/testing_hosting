import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { aplicacionService } from '@/services/aplicacion.service';
import { Aplicacion } from '@/types';
import { CreateAppForm } from '@/components/dashboard/CreateAppForm';
import { AppDashboard } from '@/components/dashboard/AppDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, RefreshCw } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [apps, setApps] = useState<Aplicacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApps = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await aplicacionService.getMyAplicaciones();
      if (response.success && response.data) {
        setApps(response.data);
      } else {
        setApps([]);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setApps([]);
      } else {
        setError(err.response?.data?.error || 'Error al cargar las aplicaciones');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAppCreated = () => {
    fetchApps();
  };

  const handleAppDeleted = () => {
    fetchApps();
  };

  const canCreateMore = apps.length < 2;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenido, {user?.nombre || 'Usuario'} • {apps.length}/2 aplicaciones
            </p>
          </div>
          <div className="flex gap-2">
            {apps.length > 0 && (
              <Button onClick={fetchApps} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* Content */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Formulario de creación (si puede crear más apps) */}
        {canCreateMore && (
          <div className="mb-8">
            {apps.length === 0 ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>No tienes ninguna aplicación</CardTitle>
                  <CardDescription>
                    Puedes crear hasta 2 aplicaciones para comenzar a deployar.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900">Crear otra aplicación</CardTitle>
                  <CardDescription className="text-green-700">
                    Puedes crear una aplicación más ({apps.length}/2 usadas)
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            <CreateAppForm onSuccess={handleAppCreated} />
          </div>
        )}

        {/* Lista de aplicaciones */}
        {apps.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Mis Aplicaciones</h2>
            {apps.map((app) => (
              <AppDashboard
                key={app.id}
                app={app}
                onUpdate={fetchApps}
                onDelete={handleAppDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
