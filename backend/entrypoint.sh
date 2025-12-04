#!/bin/sh
set -e

echo "⏳ Waiting for database to be ready..."
sleep 5

echo "🔄 Running database migrations..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma migrate deploy; then
    echo "✅ Migrations completed successfully"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⚠️  Migration failed, retrying ($RETRY_COUNT/$MAX_RETRIES)..."
      sleep 10
    else
      echo "❌ Migration failed after $MAX_RETRIES attempts, starting app anyway..."
    fi
  fi
done

echo "🚀 Starting application..."
exec "$@"
