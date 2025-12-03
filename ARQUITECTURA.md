# Arquitectura del Sistema

## Diagrama de Alto Nivel

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│  ┌─────────────────────────────────┐   │
│  │  Pages: Landing, Login,         │   │
│  │         Register, Dashboard     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Store: Zustand (Auth)          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Services: API Client (Axios)   │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               │ REST API (JSON)
               ▼
┌─────────────────────────────────────────┐
│       Backend (Express + TypeScript)    │
│  ┌─────────────────────────────────┐   │
│  │  Routes                         │   │
│  │  ├─ /api/auth                   │   │
│  │  └─ /api/aplicacion             │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Middleware                     │   │
│  │  ├─ Auth (JWT)                  │   │
│  │  ├─ Validation                  │   │
│  │  └─ Rate Limiting               │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Controllers                    │   │
│  │  ├─ AuthController              │   │
│  │  └─ AplicacionController        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Services                       │   │
│  │  └─ CoolifyService              │   │
│  └─────────────────────────────────┘   │
└──────┬─────────────────┬────────────────┘
       │                 │
       │                 │ HTTP API
       │                 ▼
       │        ┌──────────────────┐
       │        │     Coolify      │
       │        │   (Deployment)   │
       │        └──────────────────┘
       │
       │ Prisma ORM
       ▼
┌─────────────────┐
│   PostgreSQL    │
│   ┌──────────┐  │
│   │  Users   │  │
│   ├──────────┤  │
│   │Aplicacion│  │
│   ├──────────┤  │
│   │Deployment│  │
│   └──────────┘  │
└─────────────────┘
```

## Flujo de Datos

### 1. Autenticación
```
Usuario → LoginForm → authService.login() → POST /api/auth/login
→ AuthController.login() → Prisma (verificar credenciales)
→ generateToken() → JWT → Response → authStore.login()
→ localStorage.setItem('token') → Redirección a /dashboard
```

### 2. Crear Aplicación
```
Usuario → CreateAppForm → aplicacionService.createAplicacion()
→ POST /api/aplicacion → authMiddleware (verificar JWT)
→ AplicacionController.createAplicacion()
→ Verificar: usuario no tiene app (UNIQUE constraint)
→ Crear registro en DB (estado: PENDING)
→ coolifyService.createApplication() → Coolify API
→ Actualizar DB con coolifyAppId (estado: DEPLOYING)
→ Response → Frontend muestra la app
```

### 3. Deploy/Redeploy
```
Usuario → Click "Deploy" → aplicacionService.deployAplicacion()
→ POST /api/aplicacion/deploy → authMiddleware
→ AplicacionController.deployAplicacion()
→ coolifyService.deployApplication(coolifyAppId)
→ Actualizar estado DB: DEPLOYING
→ Crear registro Deployment (IN_PROGRESS)
→ Response → Frontend actualiza UI
```

### 4. Ver Logs
```
Usuario → Click "Ver Logs" → aplicacionService.getLogs()
→ GET /api/aplicacion/logs → authMiddleware
→ AplicacionController.getAplicacionLogs()
→ coolifyService.getApplicationLogs(coolifyAppId)
→ Response con logs → Frontend muestra en consola
```

## Patrones de Diseño Utilizados

### 1. **Repository Pattern**
- Prisma actúa como repository para acceso a datos
- Abstracción de lógica de base de datos

### 2. **Service Layer Pattern**
- `CoolifyService`: Encapsula toda la lógica de integración con Coolify
- Separación de concerns entre controllers y lógica de negocio

### 3. **Middleware Pattern**
- `authMiddleware`: Verificación de JWT
- `validate`: Validación de inputs
- `rateLimiter`: Control de tráfico

### 4. **DTO Pattern**
- Interfaces TypeScript definen la forma de datos
- Validación con `express-validator`

### 5. **Singleton Pattern**
- `PrismaClient`: Una sola instancia compartida
- `CoolifyService`: Instancia única exportada

### 6. **State Management (Frontend)**
- Zustand store para estado de autenticación
- React hooks para estado local de componentes

## Seguridad

### Capas de Seguridad

1. **Autenticación**
   - JWT tokens con expiración configurable
   - Passwords hasheados con bcryptjs (salt rounds: 10)
   - Token almacenado en localStorage (frontend)

2. **Autorización**
   - Middleware verifica token en cada request protegido
   - Validación de que usuario solo accede a SU app

3. **Validación de Inputs**
   - `express-validator` en todos los endpoints
   - Sanitización de datos
   - Validación de tipos y formatos

4. **Rate Limiting**
   - General: 100 req/15min
   - Auth: 5 intentos/15min
   - Operaciones críticas: 3 ops/1min

5. **CORS**
   - Solo permite origen específico (frontend URL)
   - Credenciales habilitadas

6. **Database**
   - Constraints UNIQUE en relaciones
   - CASCADE deletes para integridad referencial
   - Prisma previene SQL injection

## Escalabilidad

### Puntos de Escalabilidad

1. **Horizontal Scaling**
   - Backend stateless (JWT en lugar de sesiones)
   - Múltiples instancias pueden correr detrás de load balancer

2. **Database**
   - PostgreSQL soporta replicación
   - Índices en columnas frecuentemente consultadas
   - Connection pooling de Prisma

3. **Caching (Futuro)**
   - Redis para cache de datos de Coolify
   - Cache de queries frecuentes

4. **Queue System (Futuro)**
   - Operaciones de deploy en background
   - Webhooks de Coolify procesados asíncronamente

## Limitaciones Actuales

1. **Una App por Usuario**
   - Por diseño (relación 1:1 en DB)
   - Constraint UNIQUE en `Aplicacion.userId`

2. **Sincronización con Coolify**
   - Polling manual (usuario debe refrescar)
   - No hay webhooks implementados aún

3. **Logs**
   - Fetching on-demand (no streaming)
   - Limitado a últimas N líneas

4. **Multi-tenancy**
   - Todas las apps en la misma instancia de Coolify
   - No hay aislamiento de recursos

## Tecnologías Clave

### Backend
- **Express**: Framework web minimalista
- **Prisma**: ORM moderno con type-safety
- **JWT**: Autenticación stateless
- **Axios**: Cliente HTTP para Coolify API

### Frontend
- **React**: UI library
- **Zustand**: State management ligero
- **React Router**: Client-side routing
- **shadcn/ui**: Componentes UI accesibles
- **TailwindCSS**: Utility-first CSS

### Database
- **PostgreSQL**: Base de datos relacional
- **Prisma Migrate**: Versionado de schema

## Mejoras Arquitectónicas Futuras

1. **WebSocket Connection**
   - Logs en tiempo real
   - Actualizaciones de estado en vivo

2. **Event-Driven Architecture**
   - Webhooks de Coolify
   - Event bus para comunicación entre servicios

3. **Microservices (Opcional)**
   - Servicio de autenticación separado
   - Servicio de deployment separado

4. **Monitoring & Observability**
   - Prometheus metrics
   - Logs centralizados (ELK stack)
   - APM (Application Performance Monitoring)

5. **Multi-tenancy Mejorado**
   - Recursos dedicados por usuario
   - Límites configurables
   - Billing/Usage tracking
