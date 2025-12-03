# Guía de Docker para Coolify Wrapper

Esta guía explica cómo usar Docker y Docker Compose para ejecutar el proyecto completo.

## Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## Arquitectura de Contenedores

El proyecto está compuesto por 3 servicios:

1. **PostgreSQL** - Base de datos
2. **Backend** - API REST (Node.js + Express)
3. **Frontend** - Aplicación web (React + Nginx)

## Inicio Rápido (Producción)

### 1. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.docker.example .env

# Editar con tus valores
nano .env
```

**Importante**: Cambia los siguientes valores:
- `POSTGRES_PASSWORD` - Password seguro para PostgreSQL
- `JWT_SECRET` - Secret para JWT (mínimo 32 caracteres)
- `COOLIFY_API_URL` - URL de tu instancia Coolify
- `COOLIFY_API_TOKEN` - Token de API de Coolify

### 2. Iniciar Todos los Servicios

```bash
docker-compose up -d
```

Esto iniciará:
- PostgreSQL en puerto `5432`
- Backend en puerto `3001`
- Frontend en puerto `80`

### 3. Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### 4. Verificar Estado

```bash
docker-compose ps
```

### 5. Acceder a la Aplicación

Abre tu navegador en: `http://localhost`

## Modo Desarrollo con Hot Reload

Para desarrollo local con recarga automática:

### 1. Usar docker-compose.dev.yml

```bash
# Iniciar en modo desarrollo
docker-compose -f docker-compose.dev.yml up

# O en background
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Acceder

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

### 3. Hot Reload

Los cambios en `backend/src` y `frontend/src` se recargarán automáticamente.

## Comandos Útiles

### Gestión de Servicios

```bash
# Iniciar servicios
docker-compose up -d

# Parar servicios
docker-compose down

# Parar y eliminar volúmenes (CUIDADO: borra la BD)
docker-compose down -v

# Reiniciar un servicio
docker-compose restart backend

# Reconstruir imágenes
docker-compose build

# Reconstruir sin cache
docker-compose build --no-cache

# Ver logs en tiempo real
docker-compose logs -f
```

### Base de Datos

```bash
# Ejecutar migraciones manualmente
docker-compose exec backend npx prisma migrate deploy

# Abrir Prisma Studio (requiere puerto 5555 expuesto)
docker-compose exec backend npx prisma studio

# Conectar a PostgreSQL directamente
docker-compose exec postgres psql -U coolify_user -d coolify_wrapper

# Backup de la base de datos
docker-compose exec postgres pg_dump -U coolify_user coolify_wrapper > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T postgres psql -U coolify_user coolify_wrapper
```

### Debugging

```bash
# Entrar al contenedor backend
docker-compose exec backend sh

# Entrar al contenedor frontend
docker-compose exec frontend sh

# Ver recursos utilizados
docker stats

# Inspeccionar red
docker network inspect proyecto_deploy_coolify-network
```

## Estructura de Archivos Docker

```
proyecto_deploy/
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
├── .env.docker.example         # Ejemplo de variables
├── .env                        # Tus variables (no commitear)
├── backend/
│   ├── Dockerfile              # Build de producción
│   ├── Dockerfile.dev          # Build de desarrollo
│   ├── .dockerignore
│   └── entrypoint.sh           # Script de inicio
└── frontend/
    ├── Dockerfile              # Build de producción
    ├── Dockerfile.dev          # Build de desarrollo
    ├── .dockerignore
    └── nginx.conf              # Configuración Nginx
```

## Multi-Stage Builds

Ambos Dockerfiles (backend y frontend) usan multi-stage builds:

### Backend
1. **Builder stage**: Compila TypeScript
2. **Production stage**: Solo runtime con archivos compilados

### Frontend
1. **Builder stage**: Compila React con Vite
2. **Production stage**: Nginx sirviendo archivos estáticos

Esto reduce el tamaño final de las imágenes significativamente.

## Variables de Entorno

### PostgreSQL
- `POSTGRES_USER` - Usuario de la base de datos
- `POSTGRES_PASSWORD` - Contraseña
- `POSTGRES_DB` - Nombre de la base de datos
- `POSTGRES_PORT` - Puerto expuesto (default: 5432)

### Backend
- `NODE_ENV` - Entorno (production/development)
- `BACKEND_PORT` - Puerto expuesto (default: 3001)
- `DATABASE_URL` - URL de conexión (auto-generada)
- `JWT_SECRET` - Secret para JWT
- `JWT_EXPIRES_IN` - Expiración del token
- `COOLIFY_API_URL` - URL de Coolify API
- `COOLIFY_API_TOKEN` - Token de Coolify
- `FRONTEND_URL` - URL del frontend (para CORS)

### Frontend
- `FRONTEND_PORT` - Puerto expuesto (default: 80)
- `VITE_API_URL` - URL del backend API

## Health Checks

Todos los servicios tienen health checks configurados:

- **PostgreSQL**: `pg_isready`
- **Backend**: GET `/health`
- **Frontend**: GET `/health`

Puedes verificar el estado:
```bash
docker-compose ps
```

## Volúmenes

### Producción
- `postgres_data` - Datos persistentes de PostgreSQL

### Desarrollo
- `postgres_data_dev` - Datos de PostgreSQL
- `backend_node_modules` - Dependencias del backend
- `frontend_node_modules` - Dependencias del frontend
- Montajes de código fuente para hot reload

## Redes

Los contenedores se comunican a través de una red bridge:
- **Producción**: `coolify-network`
- **Desarrollo**: `coolify-network-dev`

Los servicios se resuelven por nombre:
- Backend conecta a `postgres:5432`
- Frontend se construye con URL del backend

## Deployment en Producción

### 1. Configurar Dominio

Edita `.env`:
```env
FRONTEND_URL=https://tu-dominio.com
VITE_API_URL=https://api.tu-dominio.com/api
```

### 2. Usar Reverse Proxy

Coloca Nginx o Traefik delante:

```nginx
# Ejemplo Nginx
server {
    listen 443 ssl;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. SSL con Let's Encrypt

```bash
# Usar certbot
certbot --nginx -d tu-dominio.com -d api.tu-dominio.com
```

### 4. Configurar Firewall

```bash
# Permitir solo puertos necesarios
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5432/tcp  # PostgreSQL solo accesible internamente
```

### 5. Backups Automáticos

Agrega un cronjob:
```bash
# Backup diario a las 3am
0 3 * * * docker-compose exec -T postgres pg_dump -U coolify_user coolify_wrapper | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### Backend no se conecta a PostgreSQL

```bash
# Verificar que PostgreSQL esté healthy
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar DATABASE_URL
docker-compose exec backend env | grep DATABASE_URL
```

### Frontend no puede hacer requests al backend

- Verifica `VITE_API_URL` en `.env`
- Recuerda reconstruir el frontend si cambias variables:
  ```bash
  docker-compose build frontend
  docker-compose up -d frontend
  ```

### Migraciones no se ejecutan

```bash
# Ejecutar manualmente
docker-compose exec backend npx prisma migrate deploy

# O reiniciar backend
docker-compose restart backend
```

### Puerto ya en uso

```bash
# Cambiar puertos en .env
BACKEND_PORT=3002
FRONTEND_PORT=8080
POSTGRES_PORT=5433

# Reiniciar
docker-compose down
docker-compose up -d
```

### Contenedor no arranca

```bash
# Ver logs detallados
docker-compose logs nombre_servicio

# Inspeccionar contenedor
docker inspect nombre_contenedor

# Entrar manualmente
docker-compose run --rm backend sh
```

## Performance y Optimización

### 1. Build Cache

Docker usa cache entre builds. Para invalidar:
```bash
docker-compose build --no-cache
```

### 2. Tamaño de Imágenes

Ver tamaño:
```bash
docker images | grep coolify-wrapper
```

Las imágenes multi-stage son mucho más pequeñas.

### 3. Límites de Recursos

Agrega límites en `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Seguridad

### 1. No ejecutar como root

Los Dockerfiles ya crean usuarios no-root (`nodejs`).

### 2. Secrets

Para producción, usa Docker secrets en lugar de .env:
```yaml
services:
  backend:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### 3. Escanear Vulnerabilidades

```bash
# Escanear imagen
docker scan coolify-wrapper-backend
```

## Actualización

```bash
# 1. Pull últimos cambios
git pull

# 2. Reconstruir imágenes
docker-compose build

# 3. Reiniciar servicios
docker-compose up -d

# 4. Verificar
docker-compose ps
docker-compose logs -f
```

## Limpieza

```bash
# Eliminar contenedores parados
docker container prune

# Eliminar imágenes sin usar
docker image prune

# Eliminar todo (CUIDADO)
docker system prune -a

# Limpiar volúmenes (CUIDADO: borra datos)
docker volume prune
```
