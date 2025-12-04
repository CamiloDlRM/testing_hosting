# Configuración de Coolify

Para que la aplicación pueda crear y gestionar aplicaciones en Coolify, necesitas obtener algunos valores de tu instancia de Coolify.

## Variables requeridas

Estas variables deben estar en tu archivo `.env` (puedes copiar `.env.docker.example` como base):

### 1. COOLIFY_API_URL
La URL base de tu API de Coolify.

**Formato**: `http://TU_IP_O_DOMINIO:8000/api/v1`

**Ejemplo**: `http://34.29.59.12:8000/api/v1`

### 2. COOLIFY_API_TOKEN
Token de autenticación para la API de Coolify.

**Cómo obtenerlo:**
1. Accede a tu instancia de Coolify
2. Ve a **Settings** → **Keys & Tokens** → **API Tokens**
3. Crea un nuevo token o copia uno existente

### 3. COOLIFY_PROJECT_UUID
UUID del proyecto en el que se crearán las aplicaciones.

**Cómo obtenerlo:**
1. Accede a tu instancia de Coolify
2. Ve a la sección **Projects**
3. Selecciona el proyecto que deseas usar
4. La URL será algo como: `http://TU_COOLIFY/project/AQUI_ESTA_EL_UUID`
5. Copia el UUID de la URL

**Alternativamente:**
- Puedes usar la API de Coolify para listar proyectos:
  ```bash
  curl -H "Authorization: Bearer TU_TOKEN" http://TU_COOLIFY:8000/api/v1/projects
  ```

### 4. COOLIFY_SERVER_UUID
UUID del servidor donde se deployarán las aplicaciones.

**Cómo obtenerlo:**
1. En Coolify, ve a **Servers**
2. Selecciona el servidor que deseas usar
3. La URL será algo como: `http://TU_COOLIFY/server/AQUI_ESTA_EL_UUID`
4. Copia el UUID de la URL

**Alternativamente:**
- Puedes usar la API de Coolify para listar servidores:
  ```bash
  curl -H "Authorization: Bearer TU_TOKEN" http://TU_COOLIFY:8000/api/v1/servers
  ```

### 5. COOLIFY_ENVIRONMENT_NAME (Opcional)
Nombre del environment donde se deployarán las aplicaciones.

**Por defecto**: `production`

**Otros valores posibles**: `staging`, `development`, etc.

## Ejemplo de configuración completa

```env
# Coolify API Configuration
COOLIFY_API_URL=http://34.29.59.12:8000/api/v1
COOLIFY_API_TOKEN=1|usoRHf80soOpPqzPf7gsYa0m7G1RhsnG4Or4QOVoc060fa95
COOLIFY_PROJECT_UUID=9a8b7c6d-5e4f-3g2h-1i0j-klmnopqrstuv
COOLIFY_SERVER_UUID=1a2b3c4d-5e6f-7g8h-9i0j-klmnopqrstuv
COOLIFY_ENVIRONMENT_NAME=production
```

## Verificar la configuración

Después de configurar las variables, reinicia los contenedores:

```bash
docker-compose down
docker-compose up -d
```

Verifica los logs del backend para asegurar que no hay errores de configuración:

```bash
docker-compose logs -f backend
```

Si todo está configurado correctamente, podrás crear aplicaciones desde el frontend sin el error "Not found".

## Referencia

- [Coolify API Documentation](https://coolify.io/docs/api-reference/api/operations/create-public-application)
- [Coolify Docs](https://coolify.io/docs/)
