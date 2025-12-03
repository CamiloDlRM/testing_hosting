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
  const [app, setApp] = useState<Aplicacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApp = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await aplicacionService.getMyAplicacion();
      if (response.success && response.data) {
        setApp(response.data);
      } else {
        setApp(null);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setApp(null);
      } else {
        setError(err.response?.data?.error || 'Error al cargar la aplicación');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAppCreated = () => {
    fetchApp();
  };

  const handleAppDeleted = () => {
    setApp(null);
  };

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
              Bienvenido, {user?.nombre || 'Usuario'}
            </p>
          </div>
          <div className="flex gap-2">
            {app && (
              <Button onClick={fetchApp} variant="outline" size="icon">
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

        {!app ? (
          <div className="max-w-2xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>No tienes ninguna aplicación</CardTitle>
                <CardDescription>
                  Puedes crear una aplicación para comenzar a deployar.
                  Recuerda: solo puedes tener una aplicación activa a la vez.
                </CardDescription>
              </CardHeader>
            </Card>
            <CreateAppForm onSuccess={handleAppCreated} />
          </div>
        ) : (
          <AppDashboard
            app={app}
            onUpdate={fetchApp}
            onDelete={handleAppDeleted}
          />
        )}
      </div>
    </div>
  );
}
