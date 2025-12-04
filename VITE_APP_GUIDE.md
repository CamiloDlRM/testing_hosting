# Guía para Deployar Aplicaciones Vite en Coolify

Las aplicaciones Vite son aplicaciones frontend que se compilan a archivos estáticos. Hay dos formas de deployarlas en Coolify:

## Opción 1: Como aplicación estática (RECOMENDADO)

### En el wrapper (modificar código):

Cuando crees la aplicación desde el frontend, selecciona tipo "static" o configura:

```javascript
{
  build_pack: "static",
  install_command: "npm install",
  build_command: "npm run build",
  publish_directory: "dist"
}
```

### Manualmente en Coolify:

1. Crea la aplicación en Coolify
2. En **General → Build Pack**: Selecciona `Static`
3. En **Build**:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Publish Directory: `dist`

## Opción 2: Con servidor Node.js (nixpacks)

Si quieres usar nixpacks (Node.js), necesitas agregar un servidor a tu proyecto Vite.

### Paso 1: Instalar `serve`

```bash
npm install --save serve
```

### Paso 2: Modificar `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "serve dist -s -l 3000"
  }
}
```

### Paso 3: Crear `nixpacks.toml` en la raíz del proyecto

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Paso 4: Asegúrate que tu `vite.config.js` tenga:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Importante para Docker
    port: 3000
  },
  preview: {
    host: '0.0.0.0', // Importante para Docker
    port: 3000
  }
})
```

## Opción 3: Usar vite preview (NO RECOMENDADO para producción)

Modificar `package.json`:

```json
{
  "scripts": {
    "start": "vite preview --host 0.0.0.0 --port 3000"
  }
}
```

**Nota**: `vite preview` no está optimizado para producción, mejor usar Opción 1 o 2.

## Repositorio de ejemplo funcional

Aquí un ejemplo de un proyecto Vite + React listo para deploy:

```json
// package.json
{
  "name": "vite-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "serve dist -s -l 3000"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "serve": "^14.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  }
})
```

## Debugging

Si tu app sigue fallando:

1. **Verifica que `npm run build` funcione localmente**
   ```bash
   npm install
   npm run build
   # Debe generar carpeta dist/
   ```

2. **Verifica que el servidor funcione localmente**
   ```bash
   npm start
   # Debe iniciar servidor en puerto 3000
   ```

3. **Revisa los logs en Coolify** para ver el error exacto

## Para aplicaciones Vue, Svelte, etc.

El proceso es similar, solo cambia el plugin en `vite.config.js`:

```javascript
// Vue
import vue from '@vitejs/plugin-vue'

// Svelte
import { svelte } from '@sveltejs/vite-plugin-svelte'
```

El resto de la configuración es idéntica.
