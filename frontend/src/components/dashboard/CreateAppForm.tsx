import { useState } from 'react';
import { aplicacionService } from '@/services/aplicacion.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';

interface CreateAppFormProps {
  onSuccess: () => void;
}

export function CreateAppForm({ onSuccess }: CreateAppFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    repositorioGit: '',
    tipoAplicacion: 'nixpacks',
  });
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const variablesEntorno: Record<string, string> = {};
      envVars.forEach((env) => {
        if (env.key && env.value) {
          variablesEntorno[env.key] = env.value;
        }
      });

      const response = await aplicacionService.createAplicacion({
        ...formData,
        variablesEntorno,
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to create application');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Tu Aplicación</CardTitle>
        <CardDescription>
          Puedes deployar una aplicación. Configura los detalles a continuación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Aplicación</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="mi-aplicacion"
              value={formData.nombre}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repositorioGit">Repositorio Git</Label>
            <Input
              id="repositorioGit"
              name="repositorioGit"
              type="url"
              placeholder="https://github.com/usuario/repo.git"
              value={formData.repositorioGit}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoAplicacion">Tipo de Aplicación</Label>
            <select
              id="tipoAplicacion"
              name="tipoAplicacion"
              value={formData.tipoAplicacion}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="nixpacks">Nixpacks (Auto-detect)</option>
              <option value="dockerfile">Dockerfile</option>
              <option value="static">Static Site</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Variables de Entorno (Opcional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEnvVar}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Variable
              </Button>
            </div>

            {envVars.map((env, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="CLAVE"
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  disabled={isLoading}
                />
                <Input
                  placeholder="valor"
                  value={env.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeEnvVar(index)}
                  disabled={isLoading}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creando y Desplegando...' : 'Crear y Deployar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
