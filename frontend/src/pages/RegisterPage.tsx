import { RegisterForm } from '@/components/auth/RegisterForm';

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Coolify Wrapper</h1>
          <p className="text-muted-foreground">Comienza tu viaje de deployment</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
