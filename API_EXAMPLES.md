# Ejemplos de Uso de la API

Este documento contiene ejemplos prácticos de cómo usar la API con `curl` o herramientas como Postman/Insomnia.

## Variables de Entorno

```bash
export API_URL="http://localhost:3001/api"
export TOKEN="your_jwt_token_here"
```

## Autenticación

### 1. Registro de Usuario

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "password123",
    "nombre": "Juan Pérez"
  }'
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-aqui",
      "email": "usuario@ejemplo.com",
      "nombre": "Juan Pérez",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2. Login

```bash
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "password123"
  }'
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-aqui",
      "email": "usuario@ejemplo.com",
      "nombre": "Juan Pérez",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 3. Obtener Usuario Autenticado

```bash
curl -X GET $API_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-aqui",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan Pérez",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "aplicacion": null
  }
}
```

## Gestión de Aplicaciones

### 4. Crear Aplicación

```bash
curl -X POST $API_URL/aplicacion \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "mi-app-node",
    "repositorioGit": "https://github.com/usuario/mi-repo.git",
    "variablesEntorno": {
      "NODE_ENV": "production",
      "PORT": "3000",
      "DATABASE_URL": "postgresql://..."
    },
    "tipoAplicacion": "nixpacks"
  }'
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-app",
    "userId": "uuid-user",
    "coolifyAppId": "coolify-id-123",
    "nombre": "mi-app-node",
    "repositorioGit": "https://github.com/usuario/mi-repo.git",
    "estado": "DEPLOYING",
    "variablesEntorno": {
      "NODE_ENV": "production",
      "PORT": "3000",
      "DATABASE_URL": "postgresql://..."
    },
    "ultimoDeployment": null,
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "Application created and deployment started"
}
```

**Error - Usuario ya tiene app**:
```json
{
  "success": false,
  "error": "You already have an application. Please delete it before creating a new one."
}
```

### 5. Obtener Aplicación

```bash
curl -X GET $API_URL/aplicacion \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-app",
    "userId": "uuid-user",
    "coolifyAppId": "coolify-id-123",
    "nombre": "mi-app-node",
    "repositorioGit": "https://github.com/usuario/mi-repo.git",
    "estado": "RUNNING",
    "variablesEntorno": {
      "NODE_ENV": "production",
      "PORT": "3000"
    },
    "ultimoDeployment": "2024-01-15T11:05:00.000Z",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:05:00.000Z",
    "deployments": [
      {
        "id": "deploy-uuid-1",
        "aplicacionId": "uuid-app",
        "version": "2024-01-15T11:05:00.000Z",
        "estado": "SUCCESS",
        "logs": null,
        "timestamp": "2024-01-15T11:05:00.000Z"
      }
    ]
  }
}
```

**Error - No tiene app**:
```json
{
  "success": false,
  "error": "No application found"
}
```

### 6. Actualizar Variables de Entorno

```bash
curl -X PATCH $API_URL/aplicacion \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variablesEntorno": {
      "NODE_ENV": "production",
      "PORT": "3000",
      "NEW_VAR": "nuevo_valor"
    }
  }'
```

### 7. Deployar/Redeploy

```bash
curl -X POST $API_URL/aplicacion/deploy \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "id": "deployment-id",
    "status": "deploying",
    "created_at": "2024-01-15T12:00:00.000Z"
  },
  "message": "Deployment started successfully"
}
```

### 8. Detener Aplicación

```bash
curl -X POST $API_URL/aplicacion/stop \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Application stopped successfully"
}
```

### 9. Reiniciar Aplicación

```bash
curl -X POST $API_URL/aplicacion/restart \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Application restarted successfully"
}
```

### 10. Obtener Logs

```bash
curl -X GET "$API_URL/aplicacion/logs?lines=100" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "logs": "[2024-01-15 12:00:00] Server started on port 3000\n[2024-01-15 12:00:01] Connected to database\n..."
  }
}
```

### 11. Eliminar Aplicación

```bash
curl -X DELETE $API_URL/aplicacion \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Application deleted successfully. You can now create a new one."
}
```

## Errores Comunes

### 401 Unauthorized - Token no provisto
```json
{
  "success": false,
  "error": "No token provided"
}
```

### 401 Unauthorized - Token inválido
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 400 Bad Request - Validación fallida
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Invalid email address",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### 429 Too Many Requests - Rate limit excedido
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Testing con Postman

### 1. Crear Collection
1. Importa estas requests en Postman
2. Crea una variable de entorno `base_url` = `http://localhost:3001/api`
3. Crea una variable de entorno `token` (se llenará después del login)

### 2. Configurar Token Automático
En el test del request de login, agrega:
```javascript
const response = pm.response.json();
if (response.success && response.data.token) {
    pm.environment.set("token", response.data.token);
}
```

### 3. Usar Token en Requests
En la pestaña Authorization de cada request protegido:
- Type: Bearer Token
- Token: `{{token}}`

## Testing con JavaScript (Axios)

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// 1. Registro
const register = async () => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: 'test@ejemplo.com',
    password: 'password123',
    nombre: 'Test User'
  });
  return response.data.data.token;
};

// 2. Login
const login = async () => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'test@ejemplo.com',
    password: 'password123'
  });
  return response.data.data.token;
};

// 3. Crear app
const createApp = async (token) => {
  const response = await axios.post(
    `${API_URL}/aplicacion`,
    {
      nombre: 'mi-app',
      repositorioGit: 'https://github.com/user/repo.git',
      variablesEntorno: {
        NODE_ENV: 'production'
      }
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

// Uso
(async () => {
  const token = await login();
  const app = await createApp(token);
  console.log('App creada:', app);
})();
```

## Rate Limits

- **General**: 100 requests / 15 minutos
- **Auth (login/register)**: 5 requests / 15 minutos
- **Operaciones críticas (deploy, delete)**: 3 requests / 1 minuto

Si excedes el límite, recibirás un error 429 y deberás esperar antes de reintentar.
