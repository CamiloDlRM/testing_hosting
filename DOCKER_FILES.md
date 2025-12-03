# Archivos Docker Creados

Este documento lista todos los archivos relacionados con Docker que se han creado en el proyecto.

## Archivos Principales

### 1. Dockerfiles

#### Backend
- `backend/Dockerfile` - Build de producción multi-stage
- `backend/Dockerfile.dev` - Build de desarrollo con hot-reload
- `backend/.dockerignore` - Archivos a excluir del build

#### Frontend
- `frontend/Dockerfile` - Build de producción multi-stage con Nginx
- `frontend/Dockerfile.dev` - Build de desarrollo con hot-reload
- `frontend/.dockerignore` - Archivos a excluir del build
- `frontend/nginx.conf` - Configuración de Nginx para producción

### 2. Docker Compose

- `docker-compose.yml` - Configuración de producción
  - PostgreSQL 15
  - Backend (API)
  - Frontend (Nginx)

- `docker-compose.dev.yml` - Configuración de desarrollo
  - PostgreSQL 15
  - Backend con hot-reload
  - Frontend con hot-reload (Vite)

### 3. Scripts

- `backend/entrypoint.sh` - Script de inicio del backend
  - Ejecuta migraciones de Prisma
  - Inicia la aplicación

- `scripts/health-check.sh` - Verificación de salud de servicios
- `scripts/init-db.sh` - Inicialización de base de datos
- `scripts/backup-db.sh` - Backup automático de PostgreSQL
- `scripts/restore-db.sh` - Restauración de backups

### 4. Configuración

- `.env.docker.example` - Variables de entorno para desarrollo
- `.env.production.example` - Variables de entorno para producción
- `Makefile` - Comandos útiles para gestión del proyecto

### 5. Documentación

- `DOCKER.md` - Documentación completa de Docker
- `QUICKSTART_DOCKER.md` - Guía de inicio rápido
- `DOCKER_FILES.md` - Este archivo

## Estructura de Directorios

```
proyecto_deploy/
├── docker-compose.yml              # Compose producción
├── docker-compose.dev.yml          # Compose desarrollo
├── .env.docker.example             # Variables dev
├── .env.production.example         # Variables prod
├── Makefile                        # Comandos útiles
├── DOCKER.md                       # Documentación completa
├── QUICKSTART_DOCKER.md            # Inicio rápido
├── DOCKER_FILES.md                 # Este archivo
│
├── backend/
│   ├── Dockerfile                  # Build producción
│   ├── Dockerfile.dev              # Build desarrollo
│   ├── .dockerignore               # Exclusiones
│   └── entrypoint.sh               # Script de inicio
│
├── frontend/
│   ├── Dockerfile                  # Build producción
│   ├── Dockerfile.dev              # Build desarrollo
│   ├── .dockerignore               # Exclusiones
│   └── nginx.conf                  # Config Nginx
│
└── scripts/
    ├── health-check.sh             # Verificación
    ├── init-db.sh                  # Inicialización
    ├── backup-db.sh                # Backup
    └── restore-db.sh               # Restauración
```

## Servicios Docker

### PostgreSQL
- **Imagen**: `postgres:15-alpine`
- **Puerto**: 5432 (configurable)
- **Volumen**: `postgres_data`
- **Health Check**: `pg_isready`

### Backend
- **Build**: Multi-stage (builder + production)
- **Puerto**: 3001 (configurable)
- **Health Check**: GET `/health`
- **Depende de**: PostgreSQL

### Frontend
- **Build**: Multi-stage (builder + nginx)
- **Puerto**: 80 (configurable)
- **Health Check**: GET `/health`
- **Depende de**: Backend

## Redes

- **Producción**: `coolify-network` (bridge)
- **Desarrollo**: `coolify-network-dev` (bridge)

## Volúmenes

### Producción
- `postgres_data` - Datos persistentes de PostgreSQL

### Desarrollo
- `postgres_data_dev` - Datos de PostgreSQL
- `backend_node_modules` - Dependencias backend
- `frontend_node_modules` - Dependencias frontend

## Comandos Rápidos

### Con Docker Compose

```bash
# Producción
docker-compose up -d              # Iniciar
docker-compose down               # Detener
docker-compose logs -f            # Ver logs
docker-compose ps                 # Estado
docker-compose restart            # Reiniciar

# Desarrollo
docker-compose -f docker-compose.dev.yml up
```

### Con Makefile

```bash
make setup        # Setup inicial
make up           # Iniciar producción
make down         # Detener
make logs         # Ver logs
make dev-up       # Iniciar desarrollo
make backup       # Backup de DB
make help         # Ver todos los comandos
```

### Scripts

```bash
# Verificar salud
./scripts/health-check.sh

# Inicializar DB
./scripts/init-db.sh

# Backup
./scripts/backup-db.sh

# Restaurar
./scripts/restore-db.sh
```

## Variables de Entorno Importantes

### Obligatorias
- `POSTGRES_PASSWORD` - Password de PostgreSQL
- `JWT_SECRET` - Secret para JWT (min 32 caracteres)
- `COOLIFY_API_URL` - URL de Coolify
- `COOLIFY_API_TOKEN` - Token de Coolify API

### Opcionales con Defaults
- `POSTGRES_USER` (default: coolify_user)
- `POSTGRES_DB` (default: coolify_wrapper)
- `POSTGRES_PORT` (default: 5432)
- `BACKEND_PORT` (default: 3001)
- `FRONTEND_PORT` (default: 80)
- `JWT_EXPIRES_IN` (default: 7d)

## Multi-Stage Builds

### Backend Dockerfile

**Stage 1: Builder**
- Instala todas las dependencias
- Genera Prisma Client
- Compila TypeScript

**Stage 2: Production**
- Solo Node.js Alpine
- Solo dependencias de producción
- Prisma Client copiado
- Usuario no-root
- Health check

**Resultado**: Imagen optimizada (~200MB)

### Frontend Dockerfile

**Stage 1: Builder**
- Instala dependencias
- Compila React con Vite
- Genera archivos estáticos

**Stage 2: Production**
- Nginx Alpine
- Solo archivos estáticos
- Configuración optimizada
- Health check

**Resultado**: Imagen muy liviana (~30MB)

## Health Checks

Todos los servicios tienen health checks configurados:

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U coolify_user"]
  interval: 10s
  timeout: 5s
  retries: 5

# Backend
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get(...)"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 40s

# Frontend
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost/health"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

## Seguridad

### Implementado
- ✅ Multi-stage builds (reduce superficie de ataque)
- ✅ Usuarios no-root en contenedores
- ✅ Archivos .dockerignore (no expone código sensible)
- ✅ Health checks (detecta problemas rápido)
- ✅ Variables de entorno (no hardcoded)
- ✅ Nginx optimizado (headers de seguridad)

### Recomendaciones Adicionales
- 🔒 Usar Docker secrets en producción
- 🔒 Escanear imágenes con `docker scan`
- 🔒 Actualizar imágenes base regularmente
- 🔒 Limitar recursos con `deploy.resources`
- 🔒 Usar redes privadas para comunicación interna

## Optimizaciones

### Tamaño de Imágenes
- Backend: ~200MB (vs ~900MB sin multi-stage)
- Frontend: ~30MB (vs ~1.2GB sin multi-stage)

### Build Cache
- Dependencias instaladas primero (mejor cache)
- Código copiado al final
- `.dockerignore` evita invalidación innecesaria

### Performance
- Nginx con compresión gzip
- Cache de assets estáticos
- Health checks para failover rápido

## Troubleshooting

Ver archivos de documentación:
- [DOCKER.md](DOCKER.md) - Sección completa de troubleshooting
- [README.md](README.md) - FAQ general

## Próximos Pasos

Para empezar a usar Docker:

1. Lee [QUICKSTART_DOCKER.md](QUICKSTART_DOCKER.md)
2. Copia `.env.docker.example` a `.env`
3. Edita variables de entorno
4. Ejecuta `docker-compose up -d`
5. Accede a http://localhost

Para desarrollo:
1. Ejecuta `docker-compose -f docker-compose.dev.yml up`
2. Edita código en `backend/src` o `frontend/src`
3. Los cambios se recargan automáticamente

Para producción:
1. Lee [DOCKER.md](DOCKER.md) sección "Deployment en Producción"
2. Usa `.env.production.example`
3. Configura reverse proxy (Nginx/Traefik)
4. Habilita SSL
5. Configura backups automáticos
