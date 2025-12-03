# Inicio Rápido con Docker

La forma más simple de ejecutar Coolify Wrapper es usando Docker Compose.

## Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## Pasos

### 1. Clonar y Configurar

```bash
git clone <tu-repositorio>
cd proyecto_deploy
cp .env.docker.example .env
```

### 2. Editar Variables de Entorno

Abre `.env` y configura:

```env
# PostgreSQL
POSTGRES_PASSWORD=tu_password_seguro

# JWT
JWT_SECRET=tu_secreto_super_seguro_min_32_caracteres

# Coolify API
COOLIFY_API_URL=https://tu-coolify.com/api/v1
COOLIFY_API_TOKEN=tu_token_de_coolify
```

### 3. Iniciar Servicios

```bash
docker-compose up -d
```

### 4. Verificar

```bash
docker-compose ps
```

Deberías ver 3 servicios corriendo:
- `coolify-wrapper-postgres`
- `coolify-wrapper-backend`
- `coolify-wrapper-frontend`

### 5. Acceder

Abre tu navegador en:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

## Comandos Útiles

```bash
# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver estado
docker-compose ps

# Reconstruir y reiniciar
docker-compose up -d --build
```

## Usando el Makefile

Si tienes `make` instalado:

```bash
# Setup inicial
make setup

# Iniciar servicios
make up

# Ver logs
make logs

# Detener servicios
make down

# Ver todos los comandos
make help
```

## Troubleshooting

### Puerto 80 ya en uso

Edita `.env`:
```env
FRONTEND_PORT=8080
```

Y reinicia:
```bash
docker-compose down
docker-compose up -d
```

### Backend no conecta a PostgreSQL

Espera unos segundos más, PostgreSQL tarda en iniciar. Verifica:
```bash
docker-compose logs postgres
docker-compose logs backend
```

### Ver base de datos

```bash
docker-compose exec postgres psql -U coolify_user coolify_wrapper
```

## Backup de Base de Datos

```bash
# Crear backup
docker-compose exec postgres pg_dump -U coolify_user coolify_wrapper > backup.sql

# O con make
make backup
```

## Modo Desarrollo

Para desarrollo con hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up

# O con make
make dev-up
```

Frontend estará en http://localhost:5173

## Próximos Pasos

1. Regístrate en http://localhost
2. Crea tu primera aplicación
3. Configura tu repositorio Git
4. Deploy!

## Más Información

- [DOCKER.md](DOCKER.md) - Documentación completa de Docker
- [README.md](README.md) - Documentación del proyecto
- [API_EXAMPLES.md](API_EXAMPLES.md) - Ejemplos de API
