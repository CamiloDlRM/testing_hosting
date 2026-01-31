# Coolify Wrapper

Interfaz web multi-usuario para Coolify. Permite a cada usuario gestionar una aplicación propia con deploy, logs y variables de entorno.

## Requisitos

- Node.js 18+
- PostgreSQL
- Instancia de Coolify con API habilitada

## Inicio rápido (Docker)

```bash
git clone <repo>
cd proyecto_deploy
cp .env.docker.example .env
# Editar .env con credenciales de Coolify
docker-compose up -d
```

Frontend en `http://localhost`, backend en `http://localhost:3001`.

## Instalación manual

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configurar `.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/coolify_wrapper?schema=public"
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
COOLIFY_API_URL=https://tu-coolify.com/api/v1
COOLIFY_API_TOKEN=tu_token
FRONTEND_URL=http://localhost:5173
```

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Configurar `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

```bash
npm run dev
```

## Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT

**Frontend:** React, TypeScript, Vite, Zustand, TailwindCSS, shadcn/ui

## API

### Auth

| Endpoint | Descripcion |
|----------|-------------|
| `POST /api/auth/register` | Registro |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Usuario actual |

### Aplicacion

Requieren header `Authorization: Bearer <token>`.

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/aplicacion` | Obtener app |
| `POST /api/aplicacion` | Crear app |
| `PATCH /api/aplicacion` | Actualizar |
| `DELETE /api/aplicacion` | Eliminar |
| `POST /api/aplicacion/deploy` | Deploy |
| `POST /api/aplicacion/stop` | Detener |
| `POST /api/aplicacion/restart` | Reiniciar |
| `GET /api/aplicacion/logs` | Logs |

## Configuracion Coolify

1. En Coolify: Settings > API Tokens
2. Crear token con permisos completos
3. Agregar URL y token al `.env` del backend

## Produccion

Backend:
```bash
npm run build && npm start
```

Frontend:
```bash
npm run build
# Servir dist/ con nginx o similar
```

Usar `NODE_ENV=production`, configurar HTTPS y reverse proxy.

## Licencia

MIT
