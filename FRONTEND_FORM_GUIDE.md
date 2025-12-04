# Guía para actualizar el formulario del Frontend

El formulario de creación de aplicaciones necesita ser actualizado para soportar todos los nuevos campos.

## Estructura del formulario:

### 1. Campos básicos (siempre visibles):

```tsx
- Nombre de la aplicación (text input) *requerido
- URL del repositorio Git (text input) *requerido
- Rama (text input, default: "main")
```

### 2. Selector de tipo de aplicación:

```tsx
<select name="tipoAplicacion">
  <option value="NIXPACKS">Auto-detect (Node.js, Python, Go, etc.)</option>
  <option value="STATIC">Static Site (Vite, React, Angular build)</option>
  <option value="DOCKERFILE">Dockerfile</option>
  <option value="DOCKER_COMPOSE">Docker Compose</option>
</select>
```

### 3. Configuración dinámica según tipo:

#### Si tipoAplicacion === "NIXPACKS" o "DOCKERFILE" o "DOCKER_COMPOSE":

```tsx
- Puerto (number input, default: 3000)
```

#### Si tipoAplicacion === "NIXPACKS":

```tsx
<details>
  <summary>Comandos personalizados (opcional)</summary>
  - Install Command (text input, placeholder: "npm install")
  - Build Command (text input, placeholder: "npm run build")
  - Start Command (text input, placeholder: "npm start")
</details>
```

#### Si tipoAplicacion === "STATIC":

```tsx
<details open>
  <summary>Configuración de build *requerido</summary>
  - Build Command (text input) *requerido, placeholder: "npm run build"
  - Publish Directory (text input) *requerido, placeholder: "dist"
  - Install Command (text input, placeholder: "npm install")
</details>
```

#### Para todos los tipos (opcional):

```tsx
<details>
  <summary>Configuración avanzada (opcional)</summary>
  - Base Directory (text input, placeholder: "apps/frontend")
</details>
```

### 4. Variables de entorno (siempre disponible):

```tsx
<details>
  <summary>Variables de entorno (opcional)</summary>
  {/* Lista dinámica de key-value pairs */}
</details>
```

## Ejemplo de implementación React:

```tsx
import { useState } from 'react';

function CreateAppForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    repositorioGit: '',
    ramaBranch: 'main',
    tipoAplicacion: 'NIXPACKS',
    puerto: 3000,
    buildCommand: '',
    publishDirectory: '',
    installCommand: '',
    startCommand: '',
    baseDirectory: '',
    variablesEntorno: {},
  });

  const showPortField = ['NIXPACKS', 'DOCKERFILE', 'DOCKER_COMPOSE'].includes(
    formData.tipoAplicacion
  );

  const showCustomCommands = formData.tipoAplicacion === 'NIXPACKS';

  const showStaticConfig = formData.tipoAplicacion === 'STATIC';

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos básicos */}
      <input
        type="text"
        placeholder="Nombre de la aplicación"
        value={formData.nombre}
        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
        required
      />

      <input
        type="url"
        placeholder="https://github.com/usuario/repo.git"
        value={formData.repositorioGit}
        onChange={(e) => setFormData({...formData, repositorioGit: e.target.value})}
        required
      />

      <input
        type="text"
        placeholder="Rama (default: main)"
        value={formData.ramaBranch}
        onChange={(e) => setFormData({...formData, ramaBranch: e.target.value})}
      />

      {/* Tipo de aplicación */}
      <label>Tipo de aplicación:</label>
      <select
        value={formData.tipoAplicacion}
        onChange={(e) => setFormData({...formData, tipoAplicacion: e.target.value})}
      >
        <option value="NIXPACKS">🔄 Auto-detect (Node.js, Python, Go, etc.)</option>
        <option value="STATIC">📄 Static Site (Vite, React, Angular)</option>
        <option value="DOCKERFILE">🐳 Dockerfile</option>
        <option value="DOCKER_COMPOSE">🐙 Docker Compose</option>
      </select>

      {/* Puerto (solo si no es static) */}
      {showPortField && (
        <input
          type="number"
          placeholder="Puerto"
          value={formData.puerto}
          onChange={(e) => setFormData({...formData, puerto: parseInt(e.target.value)})}
        />
      )}

      {/* Comandos custom para NIXPACKS */}
      {showCustomCommands && (
        <details>
          <summary>⚙️ Comandos personalizados (opcional)</summary>
          <input
            type="text"
            placeholder="Install command (ej: npm install)"
            value={formData.installCommand}
            onChange={(e) => setFormData({...formData, installCommand: e.target.value})}
          />
          <input
            type="text"
            placeholder="Build command (ej: npm run build)"
            value={formData.buildCommand}
            onChange={(e) => setFormData({...formData, buildCommand: e.target.value})}
          />
          <input
            type="text"
            placeholder="Start command (ej: npm start)"
            value={formData.startCommand}
            onChange={(e) => setFormData({...formData, startCommand: e.target.value})}
          />
        </details>
      )}

      {/* Configuración para STATIC */}
      {showStaticConfig && (
        <div className="static-config">
          <h3>Configuración de build</h3>
          <input
            type="text"
            placeholder="Build command *requerido (ej: npm run build)"
            value={formData.buildCommand}
            onChange={(e) => setFormData({...formData, buildCommand: e.target.value})}
            required
          />
          <input
            type="text"
            placeholder="Publish directory *requerido (ej: dist)"
            value={formData.publishDirectory}
            onChange={(e) => setFormData({...formData, publishDirectory: e.target.value})}
            required
          />
          <input
            type="text"
            placeholder="Install command (opcional, ej: npm install)"
            value={formData.installCommand}
            onChange={(e) => setFormData({...formData, installCommand: e.target.value})}
          />
        </div>
      )}

      {/* Base directory (para monorepos) */}
      <details>
        <summary>📁 Configuración avanzada</summary>
        <input
          type="text"
          placeholder="Base directory (ej: apps/frontend)"
          value={formData.baseDirectory}
          onChange={(e) => setFormData({...formData, baseDirectory: e.target.value})}
        />
      </details>

      <button type="submit">Crear Aplicación</button>
    </form>
  );
}
```

## Helpers UI sugeridos:

### Presets por framework:

Agrega botones de preset para frameworks populares:

```tsx
const PRESETS = {
  'vite-react': {
    tipoAplicacion: 'STATIC',
    buildCommand: 'npm run build',
    publishDirectory: 'dist',
  },
  'next-js': {
    tipoAplicacion: 'NIXPACKS',
    puerto: 3000,
  },
  'vite-with-server': {
    tipoAplicacion: 'NIXPACKS',
    puerto: 3000,
    buildCommand: 'npm run build',
    startCommand: 'npm start',
  },
  'angular': {
    tipoAplicacion: 'STATIC',
    buildCommand: 'npm run build',
    publishDirectory: 'dist/my-app',
  },
};

// Botones:
<div className="presets">
  <button onClick={() => applyPreset('vite-react')}>Vite/React</button>
  <button onClick={() => applyPreset('next-js')}>Next.js</button>
  <button onClick={() => applyPreset('vite-with-server')}>Vite + Server</button>
  <button onClick={() => applyPreset('angular')}>Angular</button>
</div>
```

### Tooltips de ayuda:

```tsx
<TooltipInfo>
  NIXPACKS: Detecta automáticamente Node.js, Python, Go, Rust, PHP, etc.
</TooltipInfo>

<TooltipInfo>
  STATIC: Para aplicaciones que generan archivos HTML/CSS/JS (no tienen servidor)
</TooltipInfo>
```

## Validación:

```tsx
const validate = () => {
  if (!formData.nombre || !formData.repositorioGit) {
    alert('Nombre y repositorio son requeridos');
    return false;
  }

  if (formData.tipoAplicacion === 'STATIC') {
    if (!formData.buildCommand || !formData.publishDirectory) {
      alert('Para apps estáticas, buildCommand y publishDirectory son requeridos');
      return false;
    }
  }

  return true;
};
```

## Request final al backend:

```tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  // Limpiar campos vacíos antes de enviar
  const payload = Object.fromEntries(
    Object.entries(formData).filter(([_, value]) => value !== '' && value !== null)
  );

  const response = await fetch('/api/aplicaciones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  // Handle response...
};
```
