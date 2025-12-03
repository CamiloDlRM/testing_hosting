import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Coolify Wrapper</h1>
          <p className="text-muted-foreground">Bienvenido de vuelta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
