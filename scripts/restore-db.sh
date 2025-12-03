#!/bin/bash

# Script para restaurar backup de la base de datos

set -e

BACKUP_DIR="./backups"

# Verificar que existan backups
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
    echo "❌ No hay backups disponibles en $BACKUP_DIR"
    exit 1
fi

# Listar backups disponibles
echo "📋 Backups disponibles:"
ls -lht "$BACKUP_DIR"/backup_*.sql.gz | nl

# Seleccionar backup
echo ""
read -p "¿Número de backup a restaurar (Enter para el más reciente): " backup_num

if [ -z "$backup_num" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | head -1)
else
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | sed -n "${backup_num}p")
fi

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Backup no encontrado"
    exit 1
fi

echo ""
echo "⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual"
echo "Archivo a restaurar: $BACKUP_FILE"
read -p "¿Continuar? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🔄 Restaurando backup..."

# Restaurar
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U coolify_user coolify_wrapper

echo "✅ Backup restaurado exitosamente"
