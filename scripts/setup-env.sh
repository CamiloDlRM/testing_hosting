#!/bin/bash

# Script interactivo para configurar el archivo .env

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Configuración del archivo .env${NC}"
echo ""

# Verificar si ya existe .env
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  El archivo .env ya existe.${NC}"
    read -p "¿Deseas sobrescribirlo? (y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo -e "${RED}❌ Operación cancelada${NC}"
        exit 0
    fi
fi

echo -e "${GREEN}Vamos a configurar las variables necesarias...${NC}"
echo ""

# Coolify API URL
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. Coolify API URL${NC}"
echo "Ejemplo: https://tu-coolify-instance.com/api/v1"
read -p "Ingresa la URL de Coolify API: " COOLIFY_API_URL

if [ -z "$COOLIFY_API_URL" ]; then
    echo -e "${RED}❌ La URL de Coolify es obligatoria${NC}"
    exit 1
fi

# Coolify API Token
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. Coolify API Token${NC}"
echo "Obtén tu token desde: Settings → API Tokens en Coolify"
read -p "Ingresa tu Coolify API Token: " COOLIFY_API_TOKEN

if [ -z "$COOLIFY_API_TOKEN" ]; then
    echo -e "${RED}❌ El token de Coolify es obligatorio${NC}"
    exit 1
fi

# JWT Secret
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. JWT Secret${NC}"
echo "Debe ser una cadena aleatoria de al menos 32 caracteres"
read -p "Ingresa JWT_SECRET (Enter para generar uno automático): " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 48)
    echo -e "${GREEN}✓ JWT_SECRET generado automáticamente${NC}"
fi

# PostgreSQL Password
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4. PostgreSQL Password${NC}"
read -p "Ingresa password para PostgreSQL (Enter para generar uno): " POSTGRES_PASSWORD

if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 24 2>/dev/null || LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    echo -e "${GREEN}✓ Password generado automáticamente${NC}"
fi

# Configuración adicional
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5. Configuración Adicional (Opcional)${NC}"
read -p "Puerto del frontend (default: 80): " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-80}

read -p "Puerto del backend (default: 3001): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-3001}

# Crear archivo .env
echo ""
echo -e "${GREEN}📝 Creando archivo .env...${NC}"

cat > .env <<EOF
# PostgreSQL Configuration
POSTGRES_USER=coolify_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=coolify_wrapper
POSTGRES_PORT=5432

# Backend Configuration
NODE_ENV=development
BACKEND_PORT=$BACKEND_PORT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Coolify API Configuration
COOLIFY_API_URL=$COOLIFY_API_URL
COOLIFY_API_TOKEN=$COOLIFY_API_TOKEN

# Frontend Configuration
FRONTEND_PORT=$FRONTEND_PORT
FRONTEND_URL=http://localhost:$FRONTEND_PORT
VITE_API_URL=http://localhost:$BACKEND_PORT/api
EOF

echo -e "${GREEN}✅ Archivo .env creado exitosamente!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 Resumen de configuración:${NC}"
echo ""
echo "Coolify API URL: $COOLIFY_API_URL"
echo "Coolify API Token: ${COOLIFY_API_TOKEN:0:10}..."
echo "JWT Secret: ${JWT_SECRET:0:10}... (generado)"
echo "PostgreSQL Password: ${POSTGRES_PASSWORD:0:10}... (generado)"
echo "Frontend Port: $FRONTEND_PORT"
echo "Backend Port: $BACKEND_PORT"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Siguiente paso:${NC}"
echo ""
echo -e "${YELLOW}Para iniciar en modo desarrollo:${NC}"
echo "  docker-compose -f docker-compose.dev.yml up"
echo ""
echo -e "${YELLOW}Para iniciar en modo producción:${NC}"
echo "  docker-compose up -d"
echo ""
echo -e "${YELLOW}O usando make:${NC}"
echo "  make dev-up    # Desarrollo"
echo "  make up        # Producción"
echo ""
