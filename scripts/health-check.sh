#!/bin/bash

# Script para verificar la salud de todos los servicios

set -e

echo "🏥 Verificando salud de servicios..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar servicio
check_service() {
    local name=$1
    local url=$2

    echo -n "Verificando $name... "

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ ERROR${NC}"
        return 1
    fi
}

# Verificar PostgreSQL
echo -n "Verificando PostgreSQL... "
if docker-compose exec -T postgres pg_isready -U coolify_user > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ ERROR${NC}"
fi

# Verificar Backend
check_service "Backend" "http://localhost:3001/health"

# Verificar Frontend
check_service "Frontend" "http://localhost/health"

echo ""
echo "📊 Estado de contenedores:"
docker-compose ps

echo ""
echo "💾 Uso de volúmenes:"
docker volume ls | grep proyecto_deploy || echo "No hay volúmenes"

echo ""
echo "🌐 Redes:"
docker network ls | grep proyecto_deploy || echo "No hay redes"

echo ""
echo "✅ Verificación completada"
