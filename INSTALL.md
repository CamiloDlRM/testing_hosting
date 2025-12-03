# Guía de Instalación Rápida

## Opción 1: Docker (Recomendado) 🐳

La forma más rápida y simple:

```bash
# 1. Clonar y configurar
git clone <tu-repo>
cd proyecto_deploy
cp .env.docker.example .env

# 2. Editar .env con tus valores de Coolify
nano .env

# 3. Iniciar todo
docker-compose up -d

# 4. Acceder a http://localhost
```

Ver [QUICKSTART_DOCKER.md](QUICKSTART_DOCKER.md) para más detalles.

## Opción 2: Instalación Local (Desarrollo)

### Paso 1: Prerrequisitos
- Node.js 18+ instalado
- PostgreSQL instalado y corriendo
- Tener acceso a una instancia de Coolify

### Paso 2: Clonar y configurar

```bash
# Clonar el repositorio
git clone <tu-repo>
cd proyecto_deploy

# Instalar dependencias del backend
cd backend
npm install

# Configurar .env del backend
cp .env.example .env
# Editar .env con tus valores

# Configurar base de datos
npm run prisma:generate
npm run prisma:migrate

# Instalar dependencias del frontend
cd ../frontend
npm install

# Configurar .env del frontend
cp .env.example .env
```

### Paso 3: Iniciar aplicación

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Accede a `http://localhost:5173` para ver la aplicación.

## Variables de Entorno Requeridas

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/coolify_wrapper"
JWT_SECRET="tu-secreto-super-seguro"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
COOLIFY_API_URL="https://tu-coolify.com/api/v1"
COOLIFY_API_TOKEN="tu-token-de-coolify"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
```

## Verificación

1. Abre `http://localhost:5173`
2. Deberías ver la landing page
3. Haz clic en "Comenzar Ahora"
4. Regístrate con un email y contraseña
5. Deberías ser redirigido al dashboard
6. Crea tu primera aplicación

## Troubleshooting Común

### Backend no inicia
- Verifica que PostgreSQL esté corriendo
- Verifica que todas las variables de `.env` estén configuradas
- Ejecuta `npm run prisma:generate` de nuevo

### Frontend no se conecta al backend
- Verifica que el backend esté corriendo en el puerto 3001
- Verifica `VITE_API_URL` en el `.env` del frontend
- Revisa la consola del navegador para errores de CORS

### Error "Coolify API not configured"
- Verifica que `COOLIFY_API_URL` y `COOLIFY_API_TOKEN` estén en el `.env`
- Verifica que el token de Coolify sea válido
- Prueba la URL de Coolify manualmente

## Producción

Para deployment en producción, consulta el archivo `README.md` en la sección "Deployment en Producción".
