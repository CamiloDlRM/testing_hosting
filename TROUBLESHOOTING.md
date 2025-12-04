# Troubleshooting

## Aplicación muestra "exited" en Coolify después de crearla

Si después de crear una aplicación en Coolify, el UI muestra el estado "exited" (salida), esto significa que el contenedor se inició pero terminó inmediatamente.

### Causas comunes:

#### 1. **La aplicación no tiene un servidor web configurado**
   - La aplicación debe tener un servidor web que escuche en el puerto 3000
   - Ejemplo Node.js:
     ```javascript
     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
     ```

#### 2. **Falta el comando de inicio (start command)**
   - Verifica que tu `package.json` tenga un script `start`:
     ```json
     {
       "scripts": {
         "start": "node index.js"
       }
     }
     ```

#### 3. **Error en el build o al iniciar**
   - Ve a Coolify → Tu aplicación → Pestaña "Deployments"
   - Haz clic en el último deployment para ver los logs completos
   - Revisa los errores en los logs de build y runtime

#### 4. **Puerto incorrecto**
   - Asegúrate de que tu aplicación escuche en el puerto configurado en la variable de entorno `PORT`
   - Por defecto, las apps creadas desde este wrapper usan el puerto 3000

#### 5. **Buildpack incorrecto**
   - Si usas un framework específico, puede que necesites seleccionar el buildpack correcto
   - Opciones: `nixpacks` (auto-detect), `dockerfile`, `docker-compose`, `static`

### Cómo verificar y solucionar:

1. **Ver logs del deployment en Coolify:**
   ```
   Coolify UI → Tu aplicación → Deployments → Click en el deployment más reciente
   ```

2. **Verificar configuración de la app en Coolify:**
   - Ve a la configuración de la aplicación en Coolify
   - Verifica que el puerto esté configurado como `3000`
   - Verifica que la rama de Git sea correcta (`main` o `master`)

3. **Probar deployment manual:**
   - En Coolify UI, haz clic en "Deploy" manualmente
   - Observa los logs en tiempo real para identificar el error

4. **Verificar que tu repositorio sea público:**
   - Si es privado, necesitas configurar credenciales de Git en Coolify

### Ejemplo de aplicación Node.js simple que funciona:

```javascript
// index.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Coolify!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

```json
// package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

### Notas importantes:

- **SIEMPRE** usa `0.0.0.0` como host al hacer listen, NO uses `localhost`
- **SIEMPRE** lee el puerto de `process.env.PORT`
- **SIEMPRE** ten un comando `start` en tu package.json
- **VERIFICA** los logs en Coolify para errores específicos

## Logs no disponibles

Si ves el mensaje "Application is not running" al intentar obtener logs:
- La aplicación todavía no ha iniciado exitosamente
- Verifica el estado del deployment en Coolify UI
- Espera a que el deployment complete
- Si el deployment completó pero la app sigue sin correr, revisa los logs de deployment en Coolify para errores
