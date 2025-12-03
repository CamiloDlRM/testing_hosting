#!/bin/bash

# Script para hacer backup de la base de datos

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql.gz"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "💾 Creando backup de la base de datos..."
echo "Archivo: $BACKUP_DIR/$FILENAME"

# Hacer backup
docker-compose exec -T postgres pg_dump -U coolify_user coolify_wrapper | gzip > "$BACKUP_DIR/$FILENAME"

# Verificar tamaño
SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✅ Backup completado: $SIZE"

# Listar backups existentes
echo ""
echo "📋 Backups disponibles:"
ls -lh "$BACKUP_DIR" | grep backup_

# Limpiar backups antiguos (mantener últimos 7)
echo ""
echo "🧹 Limpiando backups antiguos (manteniendo últimos 7)..."
ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +8 | xargs -r rm
echo "✅ Limpieza completada"
