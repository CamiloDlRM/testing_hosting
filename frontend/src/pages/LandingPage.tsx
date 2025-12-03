import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Shield, Zap, GitBranch } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Coolify Wrapper
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Despliega tu aplicación en la nube con un solo click. Simple, rápido y seguro.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">
                Comenzar Ahora
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Rocket className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Deploy Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Despliega tu aplicación en minutos. Solo conecta tu repositorio Git y listo.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Seguro</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Tu aplicación está aislada y protegida. Solo tú tienes acceso a ella.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Simple</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Una aplicación por usuario. Sin complicaciones, sin costos ocultos.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <GitBranch className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Git Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Conecta directamente con GitHub, GitLab o cualquier repositorio Git.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            ¿Cómo Funciona?
          </h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>1. Crea tu cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Regístrate con tu email y comienza en segundos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Configura tu aplicación</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Proporciona tu repositorio Git y variables de entorno necesarias.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Deploy automático</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Nosotros nos encargamos del resto. Tu app estará en vivo en minutos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Gestiona y monitorea</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Controla tu aplicación desde el dashboard: start, stop, logs en vivo y más.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para Deployar?
          </h2>
          <p className="text-muted-foreground mb-6">
            Únete ahora y despliega tu primera aplicación gratis.
          </p>
          <Link to="/register">
            <Button size="lg">
              Crear Cuenta Gratis
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
