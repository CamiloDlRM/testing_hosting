# Coolify Wrapper - Plataforma Multi-Usuario de Deployment

Una aplicación web completa que funciona como wrapper/interfaz para Coolify, permitiendo a múltiples usuarios gestionar sus propios deployments de forma aislada y segura. **Cada usuario puede hospedar UNA aplicación**.

## Características Principales

- **Sistema Multi-usuario**: Autenticación propia con JWT
- **Una App por Usuario**: Restricción de una aplicación por usuario
- **Gestión Completa**: Deploy, redeploy, start, stop, restart
- **Logs en Vivo**: Visualización de logs de aplicaciones
- **Variables de Entorno**: Configuración segura de variables
- **Integración Coolify**: Comunicación directa con Coolify API
- **UI Moderna**: Interfaz con React, TypeScript y shadcn/ui
- **🐳 Dockerizado**: Listo para deployment con Docker y Docker Compose

## Inicio Rápido con Docker 🚀

La forma más rápida de ejecutar el proyecto completo:

```bash
# 1. Clonar el repositorio
git clone <tu-repo>
cd proyecto_deploy

# 2. Configurar variables de entorno
cp .env.docker.example .env
nano .env  # Editar con tus valores de Coolify

# 3. Iniciar todos los servicios
docker-compose up -d

# 4. Acceder a la aplicación
# Frontend: http://localhost
# Backend: http://localhost:3001
```

Ver [DOCKER.md](DOCKER.md) para documentación completa de Docker.

## Stack Tecnológico

### Backend
- **Runtime**: Node.js con Express
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT (jsonwebtoken)
- **Seguridad**: bcryptjs, express-rate-limit, express-validator

### Frontend
- **Framework**: React 18
- **Lenguaje**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Estado**: Zustand
- **Estilos**: TailwindCSS
- **Componentes**: shadcn/ui
- **Iconos**: Lucide React
- **HTTP Client**: Axios

## Estructura del Proyecto

```
proyecto_deploy/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── aplicacion.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── rateLimiter.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── aplicacion.routes.ts
│   │   ├── services/
│   │   │   └── coolify.service.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── prisma.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   ├── LoginForm.tsx
    │   │   │   └── RegisterForm.tsx
    │   │   ├── dashboard/
    │   │   │   ├── CreateAppForm.tsx
    │   │   │   └── AppDashboard.tsx
    │   │   ├── ui/
    │   │   │   ├── button.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── label.tsx
    │   │   │   ├── badge.tsx
    │   │   │   └── alert.tsx
    │   │   └── ProtectedRoute.tsx
    │   ├── pages/
    │   │   ├── LandingPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── DashboardPage.tsx
    │   ├── services/
    │   │   ├── api.ts
    │   │   ├── auth.service.ts
    │   │   └── aplicacion.service.ts
    │   ├── store/
    │   │   └── authStore.ts
    │   ├── types/
    │   │   └── index.ts
    │   ├── lib/
    │   │   └── utils.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── .env.example
```

## Instalación

### Prerrequisitos

- Node.js 18+ y npm/yarn
- PostgreSQL instalado y corriendo
- Instancia de Coolify con acceso a la API
- Git

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd proyecto_deploy
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de ejemplo de variables de entorno
cp .env.example .env

# Editar .env con tus credenciales
nano .env
```

**Configurar variables de entorno** (`.env`):

```env
# Database
DATABASE_URL="postgresql://usuario:password@localhost:5432/coolify_wrapper?schema=public"

# JWT
JWT_SECRET=tu_secreto_super_seguro_cambialo_en_produccion
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# Coolify API
COOLIFY_API_URL=https://tu-coolify-instance.com/api/v1
COOLIFY_API_TOKEN=tu_token_de_coolify

# CORS
FRONTEND_URL=http://localhost:5173
```

**Configurar la base de datos**:

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# (Opcional) Abrir Prisma Studio para ver la DB
npm run prisma:studio
```

**Iniciar el servidor**:

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Modo producción
npm run build
npm start
```

El backend estará corriendo en `http://localhost:3001`

### 3. Configurar Frontend

Abre una nueva terminal:

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar archivo de ejemplo de variables de entorno
cp .env.example .env

# Editar .env si es necesario
nano .env
```

**Variables de entorno frontend** (`.env`):

```env
VITE_API_URL=http://localhost:3001/api
```

**Iniciar la aplicación**:

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build
npm run preview
```

El frontend estará corriendo en `http://localhost:5173`

## Modelo de Datos

### Usuario
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hasheada con bcryptjs
  nombre    String
  createdAt DateTime @default(now())

  aplicacion Aplicacion? // Relación 1:1
}
```

### Aplicacion
```prisma
model Aplicacion {
  id               String   @id @default(uuid())
  userId           String   @unique // 1:1 con User
  coolifyAppId     String?  @unique
  nombre           String
  repositorioGit   String
  estado           EstadoApp
  variablesEntorno Json?
  ultimoDeployment DateTime?

  user        User
  deployments Deployment[]
}

enum EstadoApp {
  PENDING, DEPLOYING, RUNNING, STOPPED, FAILED, DELETED
}
```

### Deployment
```prisma
model Deployment {
  id           String
  aplicacionId String
  version      String
  estado       EstadoDeployment
  logs         String?
  timestamp    DateTime

  aplicacion Aplicacion
}

enum EstadoDeployment {
  PENDING, IN_PROGRESS, SUCCESS, FAILED
}
```

## API Endpoints

### Autenticación

#### POST `/api/auth/register`
Registro de nuevo usuario.

**Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "nombre": "Juan Pérez"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "nombre": "..." },
    "token": "jwt_token_aqui"
  }
}
```

#### POST `/api/auth/login`
Iniciar sesión.

**Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```

#### GET `/api/auth/me`
Obtener información del usuario autenticado.

**Headers**: `Authorization: Bearer <token>`

### Aplicaciones

#### GET `/api/aplicacion`
Obtener la aplicación del usuario autenticado.

**Headers**: `Authorization: Bearer <token>`

#### POST `/api/aplicacion`
Crear una nueva aplicación (solo si no tiene una).

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "nombre": "mi-app",
  "repositorioGit": "https://github.com/usuario/repo.git",
  "variablesEntorno": {
    "NODE_ENV": "production",
    "API_KEY": "secret"
  },
  "tipoAplicacion": "nixpacks"
}
```

#### PATCH `/api/aplicacion`
Actualizar variables de entorno o nombre.

#### DELETE `/api/aplicacion`
Eliminar la aplicación (permite crear una nueva después).

#### POST `/api/aplicacion/deploy`
Deployar o redeploy la aplicación.

#### POST `/api/aplicacion/stop`
Detener la aplicación.

#### POST `/api/aplicacion/restart`
Reiniciar la aplicación.

#### GET `/api/aplicacion/logs?lines=100`
Obtener logs de la aplicación.

## Flujo de Usuario

1. **Registro**: El usuario se registra con email y contraseña
2. **Login**: Inicia sesión y obtiene un JWT token
3. **Dashboard Vacío**: Ve que no tiene ninguna aplicación
4. **Crear App**: Completa el formulario con:
   - Nombre de la aplicación
   - URL del repositorio Git
   - Variables de entorno (opcional)
   - Tipo de aplicación
5. **Deployment Automático**: Al crear, se despliega automáticamente en Coolify
6. **Gestión**: Puede ver estado, logs, redeploy, stop, restart
7. **Eliminar**: Si desea cambiar de app, debe eliminar la actual primero

## Seguridad

### Implementaciones de Seguridad

1. **Passwords Hasheados**: bcryptjs con salt rounds = 10
2. **JWT Tokens**: Tokens firmados con secret configurable
3. **Rate Limiting**:
   - General: 100 requests / 15 min
   - Auth: 5 intentos / 15 min
   - Operaciones críticas: 3 ops / 1 min
4. **Validación de Inputs**: express-validator en todas las rutas
5. **CORS**: Configurado solo para frontend específico
6. **Autorización**: Middleware que verifica JWT en rutas protegidas
7. **Aislamiento**: Cada usuario solo accede a SU aplicación
8. **Sanitización**: Todos los inputs son validados y limpiados

## Configuración de Coolify

### Obtener API Token

1. Accede a tu instancia de Coolify
2. Ve a Settings → API Tokens
3. Crea un nuevo token con permisos completos
4. Copia el token a tu `.env` backend

### Configurar API URL

La URL debe seguir el formato:
```
https://tu-dominio-coolify.com/api/v1
```

## Deployment en Producción

### Backend

1. **Variables de Entorno**:
   - Cambiar `JWT_SECRET` por uno seguro
   - Configurar `DATABASE_URL` de producción
   - Establecer `NODE_ENV=production`

2. **Build**:
```bash
npm run build
```

3. **Iniciar**:
```bash
npm start
```

4. **Recomendaciones**:
   - Usar PM2 o similar para gestión de procesos
   - Configurar reverse proxy (nginx/traefik)
   - Habilitar HTTPS
   - Configurar backup de base de datos

### Frontend

1. **Build**:
```bash
npm run build
```

2. **Servir** archivos estáticos del directorio `dist/`

3. **Variables de entorno**:
   - Configurar `VITE_API_URL` con la URL del backend en producción

## Troubleshooting

### Error: "Coolify API credentials not configured"
- Verifica que `COOLIFY_API_URL` y `COOLIFY_API_TOKEN` estén en el `.env`
- Reinicia el servidor backend

### Error: "User already has an application"
- Esto es esperado: cada usuario solo puede tener 1 app
- Elimina la app actual para crear una nueva

### Error de conexión a PostgreSQL
- Verifica que PostgreSQL esté corriendo
- Confirma las credenciales en `DATABASE_URL`
- Ejecuta `npm run prisma:migrate`

### Frontend no conecta con backend
- Verifica que el backend esté corriendo en el puerto correcto
- Revisa la configuración de CORS en backend
- Confirma `VITE_API_URL` en frontend

## Mejoras Futuras

- [ ] Sistema de webhooks de Coolify para actualización en tiempo real
- [ ] Notificaciones por email de deployments
- [ ] Métricas y analytics de aplicaciones
- [ ] Soporte para custom domains
- [ ] Panel de administración
- [ ] Límites de recursos por usuario
- [ ] Sistema de logs más avanzado con búsqueda
- [ ] Integración con GitHub/GitLab webhooks

## Licencia

MIT

## Soporte

Para issues y preguntas, abre un issue en el repositorio.
# testing_hosting
