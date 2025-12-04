#!/bin/bash

echo "Parando todos los contenedores..."
docker-compose down

echo "Eliminando contenedores viejos de coolify-wrapper..."
docker rm -f coolify-wrapper-frontend coolify-wrapper-backend coolify-wrapper-db 2>/dev/null || true

echo "Eliminando imágenes viejas..."
docker rmi -f proyecto_deploy-frontend proyecto_deploy-backend 2>/dev/null || true

echo "Reconstruyendo sin caché..."
docker-compose build --no-cache

echo "Levantando servicios..."
docker-compose up -d

echo "¡Listo! Verificando estado..."
docker-compose ps
