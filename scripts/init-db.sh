#!/bin/bash

# Script para inicializar la base de datos con datos de prueba (opcional)

set -e

echo "🗄️  Inicializando base de datos..."

# Esperar a que PostgreSQL esté listo
echo "Esperando a que PostgreSQL esté listo..."
sleep 5

# Ejecutar migraciones
echo "Ejecutando migraciones..."
docker-compose exec backend npx prisma migrate deploy

echo "✅ Base de datos inicializada"

# Opcional: Crear usuario de prueba
read -p "¿Deseas crear un usuario de prueba? (y/N): " create_test

if [ "$create_test" = "y" ] || [ "$create_test" = "Y" ]; then
    echo "Creando usuario de prueba..."
    echo "Email: test@ejemplo.com"
    echo "Password: test123456"
    echo "Nombre: Usuario de Prueba"
    echo ""
    echo "Puedes registrarte manualmente en la aplicación con estos datos"
fi
