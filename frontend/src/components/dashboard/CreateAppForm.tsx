import { useState } from 'react';
import { aplicacionService } from '@/services/aplicacion.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { TipoAplicacion } from '@/types';

interface CreateAppFormProps {
  onSuccess: () => void;
}

// Presets para frameworks populares
const FRAMEWORK_PRESETS = {
  'vite-react': {
    name: 'Vite + React',
    tipoAplicacion: TipoAplicacion.STATIC,
    buildCommand: 'npm run build',
    publishDirectory: 'dist',
    installCommand: 'npm install',
  },
  'vite-server': {
    name: 'Vite con Servidor (serve)',
    tipoAplicacion: TipoAplicacion.NIXPACKS,
    puerto: 3000,
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    installCommand: 'npm install',
  },
  'nextjs': {
    name: 'Next.js',
    tipoAplicacion: TipoAplicacion.NIXPACKS,
    puerto: 3000,
  },
  'angular': {
    name: 'Angular',
    tipoAplicacion: TipoAplicacion.STATIC,
    buildCommand: 'npm run build',
    publishDirectory: 'dist',
    installCommand: 'npm install',
  },
  'express': {
    name: 'Express/Node.js',
    tipoAplicacion: TipoAplicacion.NIXPACKS,
    puerto: 3000,
    startCommand: 'npm start',
  },
};

export function CreateAppForm({ onSuccess }: CreateAppFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    repositorioGit: '',
    ramaBranch: 'main',
    tipoAplicacion: TipoAplicacion.NIXPACKS,
    puerto: 3000,
    installCommand: '',
    buildCommand: '',
    startCommand: '',
    baseDirectory: '',
    publishDirectory: '',
  });

  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomCommands, setShowCustomCommands] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'puerto' ? parseInt(value) || 3000 : value
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = FRAMEWORK_PRESETS[presetKey as keyof typeof FRAMEWORK_PRESETS];
    if (preset) {
      setFormData({
        ...formData,
        tipoAplicacion: preset.tipoAplicacion,
        puerto: preset.puerto || 3000,
        buildCommand: preset.buildCommand || '',
        startCommand: preset.startCommand || '',
        installCommand: preset.installCommand || '',
        publishDirectory: preset.publishDirectory || '',
      });
    }
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

    // Validación para apps estáticas
    if (formData.tipoAplicacion === TipoAplicacion.STATIC) {
      if (!formData.buildCommand || !formData.publishDirectory) {
        setError('Para aplicaciones estáticas, Build Command y Publish Directory son requeridos');
        return;
      }
    }

    setIsLoading(true);

    try {
      const variablesEntorno: Record<string, string> = {};
      envVars.forEach((env) => {
        if (env.key && env.value) {
          variablesEntorno[env.key] = env.value;
        }
      });

      // Limpiar campos vacíos antes de enviar
      const payload: any = {
        nombre: formData.nombre,
        repositorioGit: formData.repositorioGit,
        ramaBranch: formData.ramaBranch || 'main',
        tipoAplicacion: formData.tipoAplicacion,
      };

      // Solo agregar puerto si no es STATIC
      if (formData.tipoAplicacion !== TipoAplicacion.STATIC) {
        payload.puerto = formData.puerto;
      }

      // Agregar comandos solo si tienen valor
      if (formData.installCommand) payload.installCommand = formData.installCommand;
      if (formData.buildCommand) payload.buildCommand = formData.buildCommand;
      if (formData.startCommand) payload.startCommand = formData.startCommand;
      if (formData.baseDirectory) payload.baseDirectory = formData.baseDirectory;
      if (formData.publishDirectory) payload.publishDirectory = formData.publishDirectory;

      // Variables de entorno
      if (Object.keys(variablesEntorno).length > 0) {
        payload.variablesEntorno = variablesEntorno;
      }

      const response = await aplicacionService.createAplicacion(payload);

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

  const showPortField = formData.tipoAplicacion !== TipoAplicacion.STATIC;
  const isStatic = formData.tipoAplicacion === TipoAplicacion.STATIC;
  const isNixpacks = formData.tipoAplicacion === TipoAplicacion.NIXPACKS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Tu Aplicación</CardTitle>
        <CardDescription>
          Configura tu aplicación. Selecciona un preset o configura manualmente.
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

          {/* Presets rápidos */}
          <div className="space-y-2">
            <Label>🚀 Presets Rápidos (Opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FRAMEWORK_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key)}
                  disabled={isLoading}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Campos básicos */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Aplicación *</Label>
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
            <Label htmlFor="repositorioGit">Repositorio Git *</Label>
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
            <Label htmlFor="ramaBranch">Rama de Git</Label>
            <Input
              id="ramaBranch"
              name="ramaBranch"
              placeholder="main"
              value={formData.ramaBranch}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Tipo de aplicación */}
          <div className="space-y-2">
            <Label htmlFor="tipoAplicacion">Tipo de Aplicación *</Label>
            <select
              id="tipoAplicacion"
              name="tipoAplicacion"
              value={formData.tipoAplicacion}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            >
              <option value={TipoAplicacion.NIXPACKS}>🔄 Auto-detect (Node.js, Python, Go, etc.)</option>
              <option value={TipoAplicacion.STATIC}>📄 Static Site (Vite, React, Angular)</option>
              <option value={TipoAplicacion.DOCKERFILE}>🐳 Dockerfile</option>
              <option value={TipoAplicacion.DOCKER_COMPOSE}>🐙 Docker Compose</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {isStatic && '💡 Para apps que generan HTML/CSS/JS sin servidor'}
              {isNixpacks && '💡 Detecta automáticamente el framework y configura el build'}
              {formData.tipoAplicacion === TipoAplicacion.DOCKERFILE && '💡 Usa el Dockerfile de tu repositorio'}
              {formData.tipoAplicacion === TipoAplicacion.DOCKER_COMPOSE && '💡 Usa el docker-compose.yml de tu repositorio'}
            </p>
          </div>

          {/* Puerto (solo si no es static) */}
          {showPortField && (
            <div className="space-y-2">
              <Label htmlFor="puerto">Puerto</Label>
              <Input
                id="puerto"
                name="puerto"
                type="number"
                placeholder="3000"
                value={formData.puerto}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Puerto donde tu aplicación escucha (default: 3000)
              </p>
            </div>
          )}

          {/* Configuración para STATIC */}
          {isStatic && (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Configuración de Build (Requerido para Static)
              </h4>

              <div className="space-y-2">
                <Label htmlFor="buildCommand">Build Command *</Label>
                <Input
                  id="buildCommand"
                  name="buildCommand"
                  placeholder="npm run build"
                  value={formData.buildCommand}
                  onChange={handleChange}
                  required={isStatic}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishDirectory">Publish Directory *</Label>
                <Input
                  id="publishDirectory"
                  name="publishDirectory"
                  placeholder="dist"
                  value={formData.publishDirectory}
                  onChange={handleChange}
                  required={isStatic}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Carpeta donde se generan los archivos compilados (ej: dist, build, out)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installCommand">Install Command (Opcional)</Label>
                <Input
                  id="installCommand"
                  name="installCommand"
                  placeholder="npm install"
                  value={formData.installCommand}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Comandos personalizados para NIXPACKS */}
          {isNixpacks && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomCommands(!showCustomCommands)}
                className="w-full justify-between"
              >
                <span>⚙️ Comandos Personalizados (Opcional)</span>
                {showCustomCommands ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showCustomCommands && (
                <div className="space-y-4 p-4 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Deja vacío para que Nixpacks detecte automáticamente
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="installCommand">Install Command</Label>
                    <Input
                      id="installCommand"
                      name="installCommand"
                      placeholder="npm install"
                      value={formData.installCommand}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buildCommand">Build Command</Label>
                    <Input
                      id="buildCommand"
                      name="buildCommand"
                      placeholder="npm run build"
                      value={formData.buildCommand}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startCommand">Start Command</Label>
                    <Input
                      id="startCommand"
                      name="startCommand"
                      placeholder="npm start"
                      value={formData.startCommand}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuración avanzada */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
            >
              <span>📁 Configuración Avanzada (Opcional)</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-muted rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="baseDirectory">Base Directory</Label>
                  <Input
                    id="baseDirectory"
                    name="baseDirectory"
                    placeholder="apps/frontend"
                    value={formData.baseDirectory}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Útil para monorepos. Directorio raíz de tu aplicación
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Variables de entorno */}
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
                Agregar
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
            {isLoading ? 'Creando y Desplegando...' : 'Crear y Deployar Aplicación'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
