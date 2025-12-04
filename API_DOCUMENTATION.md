# API Documentation - Updated

## Crear Aplicación (POST /api/aplicaciones)

### Nuevos campos disponibles:

```typescript
{
  // Campos básicos (requeridos)
  nombre: string;              // Nombre de la aplicación
  repositorioGit: string;      // URL del repositorio Git

  // Configuración Git (opcional)
  ramaBranch?: string;         // Rama a deployar (default: "main")

  // Tipo de aplicación (opcional)
  tipoAplicacion?: 'NIXPACKS' | 'STATIC' | 'DOCKERFILE' | 'DOCKER_COMPOSE';
  // - NIXPACKS: Auto-detecta (Node.js, Python, Go, etc) - DEFAULT
  // - STATIC: Aplicaciones estáticas (Vite, CRA, Angular build)
  // - DOCKERFILE: Usa Dockerfile del repo
  // - DOCKER_COMPOSE: Usa docker-compose.yml del repo

  // Puerto (opcional)
  puerto?: number;             // Puerto donde corre la app (default: 3000)

  // Comandos personalizados (opcionales)
  installCommand?: string;     // Ej: "npm install" o "pip install -r requirements.txt"
  buildCommand?: string;       // Ej: "npm run build" o "python manage.py collectstatic"
  startCommand?: string;       // Ej: "npm start" o "python app.py"

  // Para apps estáticas
  baseDirectory?: string;      // Directorio base del código (ej: "frontend/")
  publishDirectory?: string;   // Directorio de output (ej: "dist" o "build")

  // Variables de entorno (opcional)
  variablesEntorno?: Record<string, string>;
}
```

## Ejemplos de uso:

### 1. Aplicación Node.js/Express (NIXPACKS - Auto-detect)

```json
{
  "nombre": "Mi API Backend",
  "repositorioGit": "https://github.com/usuario/mi-api.git",
  "ramaBranch": "main",
  "puerto": 3000
}
```

**Coolify detectará automáticamente** que es Node.js y ejecutará:
- Install: `npm install`
- Build: `npm run build` (si existe)
- Start: `npm start`

---

### 2. Aplicación Vite/React (STATIC)

```json
{
  "nombre": "Mi App React",
  "repositorioGit": "https://github.com/usuario/vite-app.git",
  "ramaBranch": "main",
  "tipoAplicacion": "STATIC",
  "buildCommand": "npm run build",
  "publishDirectory": "dist"
}
```

**Resultado**: Coolify construirá la app y servirá los archivos estáticos desde `dist/`

---

### 3. Aplicación Vite con servidor Node.js (NIXPACKS)

Si tu app Vite tiene `serve` instalado y un script `start`:

```json
{
  "nombre": "Mi App React con Server",
  "repositorioGit": "https://github.com/usuario/vite-app.git",
  "ramaBranch": "main",
  "tipoAplicacion": "NIXPACKS",
  "puerto": 3000,
  "buildCommand": "npm run build",
  "startCommand": "npm start"
}
```

---

### 4. Aplicación Next.js (NIXPACKS)

```json
{
  "nombre": "Mi App Next.js",
  "repositorioGit": "https://github.com/usuario/nextjs-app.git",
  "ramaBranch": "main",
  "puerto": 3000
}
```

**Next.js se auto-detecta** y Coolify ejecutará automáticamente `next build` y `next start`

---

### 5. Aplicación Python/Flask (NIXPACKS)

```json
{
  "nombre": "Mi API Flask",
  "repositorioGit": "https://github.com/usuario/flask-api.git",
  "ramaBranch": "main",
  "puerto": 5000,
  "startCommand": "python app.py",
  "variablesEntorno": {
    "FLASK_ENV": "production",
    "PORT": "5000"
  }
}
```

---

### 6. Aplicación con Dockerfile (DOCKERFILE)

```json
{
  "nombre": "Mi App Custom",
  "repositorioGit": "https://github.com/usuario/custom-app.git",
  "ramaBranch": "main",
  "tipoAplicacion": "DOCKERFILE",
  "puerto": 8080
}
```

**Coolify usará el `Dockerfile`** en la raíz del repositorio

---

### 7. Aplicación Angular (STATIC)

```json
{
  "nombre": "Mi App Angular",
  "repositorioGit": "https://github.com/usuario/angular-app.git",
  "ramaBranch": "main",
  "tipoAplicacion": "STATIC",
  "buildCommand": "npm run build",
  "publishDirectory": "dist/mi-app"
}
```

---

### 8. Monorepo con base directory

```json
{
  "nombre": "Frontend del Monorepo",
  "repositorioGit": "https://github.com/usuario/monorepo.git",
  "ramaBranch": "main",
  "tipoAplicacion": "STATIC",
  "baseDirectory": "apps/frontend",
  "buildCommand": "npm run build",
  "publishDirectory": "dist"
}
```

---

## Matriz de compatibilidad:

| Framework/Stack | tipoAplicacion | Requiere comandos custom | Notas |
|----------------|----------------|-------------------------|-------|
| **Express/Fastify** | NIXPACKS | No | Auto-detecta |
| **Next.js** | NIXPACKS | No | Auto-detecta |
| **Nuxt.js** | NIXPACKS | No | Auto-detecta |
| **SvelteKit** | NIXPACKS | No | Auto-detecta |
| **Remix** | NIXPACKS | No | Auto-detecta |
| **Vite (build)** | STATIC | Sí | Necesita buildCommand |
| **CRA (build)** | STATIC | Sí | Necesita buildCommand |
| **Angular (build)** | STATIC | Sí | Necesita buildCommand |
| **Vue CLI (build)** | STATIC | Sí | Necesita buildCommand |
| **Vite + serve** | NIXPACKS | Sí | Necesita startCommand |
| **Python/Flask** | NIXPACKS | Tal vez | Depende del setup |
| **Python/Django** | NIXPACKS | Tal vez | Depende del setup |
| **Go** | NIXPACKS | No | Auto-detecta |
| **Rust** | NIXPACKS | No | Auto-detecta |
| **PHP/Laravel** | NIXPACKS | No | Auto-detecta |
| **Con Dockerfile** | DOCKERFILE | No | Usa tu Dockerfile |
| **Docker Compose** | DOCKER_COMPOSE | No | Usa tu docker-compose.yml |

## Tips importantes:

1. **Apps estáticas**: Siempre usa `tipoAplicacion: "STATIC"` si tu app genera solo HTML/CSS/JS
2. **Puerto personalizado**: Si tu app no usa 3000, especifica `puerto`
3. **Variables de entorno**: La variable `PORT` se agrega automáticamente para apps no-estáticas
4. **Monorepos**: Usa `baseDirectory` para apuntar a la carpeta correcta
5. **Comandos custom**: Si nixpacks no detecta correctamente, especifica los comandos manualmente

## Actualizar aplicación (PATCH /api/aplicaciones)

Los mismos campos están disponibles para actualizar (excepto nombre y repositorioGit que son inmutables).
