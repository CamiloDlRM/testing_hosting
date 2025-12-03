.PHONY: help install dev build up down logs clean restart migrate studio backup

# Variables
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV := docker-compose.dev.yml

help: ## Mostrar esta ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias (sin Docker)
	@echo "📦 Instalando dependencias..."
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Dependencias instaladas"

dev: ## Iniciar en modo desarrollo (sin Docker)
	@echo "🚀 Iniciando en modo desarrollo..."
	@echo "Backend en puerto 3001, Frontend en puerto 5173"
	@(cd backend && npm run dev) & (cd frontend && npm run dev)

# Docker Commands - Producción

build: ## Construir imágenes Docker
	@echo "🏗️  Construyendo imágenes..."
	docker-compose -f $(COMPOSE_FILE) build

up: ## Iniciar servicios en producción
	@echo "🚀 Iniciando servicios..."
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Servicios iniciados"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:3001"

down: ## Detener servicios
	@echo "⏹️  Deteniendo servicios..."
	docker-compose -f $(COMPOSE_FILE) down

logs: ## Ver logs de todos los servicios
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-backend: ## Ver logs del backend
	docker-compose -f $(COMPOSE_FILE) logs -f backend

logs-frontend: ## Ver logs del frontend
	docker-compose -f $(COMPOSE_FILE) logs -f frontend

logs-db: ## Ver logs de PostgreSQL
	docker-compose -f $(COMPOSE_FILE) logs -f postgres

restart: ## Reiniciar servicios
	@echo "🔄 Reiniciando servicios..."
	docker-compose -f $(COMPOSE_FILE) restart

ps: ## Ver estado de los servicios
	docker-compose -f $(COMPOSE_FILE) ps

# Docker Commands - Desarrollo

dev-build: ## Construir imágenes para desarrollo
	@echo "🏗️  Construyendo imágenes de desarrollo..."
	docker-compose -f $(COMPOSE_DEV) build

dev-up: ## Iniciar servicios en modo desarrollo con hot-reload
	@echo "🚀 Iniciando servicios de desarrollo..."
	docker-compose -f $(COMPOSE_DEV) up -d
	@echo "✅ Servicios de desarrollo iniciados"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:3001"

dev-down: ## Detener servicios de desarrollo
	@echo "⏹️  Deteniendo servicios de desarrollo..."
	docker-compose -f $(COMPOSE_DEV) down

dev-logs: ## Ver logs de servicios de desarrollo
	docker-compose -f $(COMPOSE_DEV) logs -f

# Database Commands

migrate: ## Ejecutar migraciones de Prisma
	@echo "🔄 Ejecutando migraciones..."
	docker-compose -f $(COMPOSE_FILE) exec backend npx prisma migrate deploy

migrate-dev: ## Crear nueva migración (desarrollo)
	@echo "🔄 Creando migración..."
	cd backend && npx prisma migrate dev

studio: ## Abrir Prisma Studio
	@echo "🎨 Abriendo Prisma Studio..."
	cd backend && npx prisma studio

backup: ## Crear backup de la base de datos
	@echo "💾 Creando backup..."
	@mkdir -p backups
	docker-compose -f $(COMPOSE_FILE) exec -T postgres pg_dump -U coolify_user coolify_wrapper | gzip > backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "✅ Backup creado en backups/"

restore: ## Restaurar último backup (CUIDADO)
	@echo "⚠️  Restaurando último backup..."
	@latest=$$(ls -t backups/*.sql.gz | head -1); \
	if [ -z "$$latest" ]; then \
		echo "❌ No hay backups disponibles"; \
		exit 1; \
	fi; \
	echo "Restaurando desde: $$latest"; \
	gunzip -c $$latest | docker-compose -f $(COMPOSE_FILE) exec -T postgres psql -U coolify_user coolify_wrapper
	@echo "✅ Backup restaurado"

# Cleaning Commands

clean: ## Limpiar contenedores, imágenes y volúmenes
	@echo "🧹 Limpiando..."
	docker-compose -f $(COMPOSE_FILE) down -v
	docker system prune -f
	@echo "✅ Limpieza completada"

clean-all: ## Limpieza profunda (CUIDADO: borra todo)
	@echo "⚠️  LIMPIEZA PROFUNDA - Esto borrará TODOS los datos"
	@read -p "¿Estás seguro? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose -f $(COMPOSE_FILE) down -v; \
		docker-compose -f $(COMPOSE_DEV) down -v; \
		docker system prune -af --volumes; \
		rm -rf backend/node_modules frontend/node_modules; \
		echo "✅ Limpieza profunda completada"; \
	else \
		echo "❌ Operación cancelada"; \
	fi

# Utility Commands

shell-backend: ## Abrir shell en contenedor backend
	docker-compose -f $(COMPOSE_FILE) exec backend sh

shell-frontend: ## Abrir shell en contenedor frontend
	docker-compose -f $(COMPOSE_FILE) exec frontend sh

shell-db: ## Abrir psql en PostgreSQL
	docker-compose -f $(COMPOSE_FILE) exec postgres psql -U coolify_user coolify_wrapper

test-backend: ## Ejecutar tests del backend (si existen)
	cd backend && npm test

test-frontend: ## Ejecutar tests del frontend (si existen)
	cd frontend && npm test

lint: ## Ejecutar linting
	cd backend && npm run lint || true
	cd frontend && npm run lint || true

# Setup Commands

setup: ## Setup inicial del proyecto
	@echo "🎯 Setup inicial..."
	@if [ ! -f .env ]; then \
		cp .env.docker.example .env; \
		echo "✅ Archivo .env creado"; \
		echo "⚠️  Por favor edita .env con tus valores de Coolify"; \
	else \
		echo "ℹ️  .env ya existe"; \
	fi
	@echo "📦 Construyendo imágenes..."
	@make build
	@echo "✅ Setup completado"
	@echo ""
	@echo "Siguiente paso: Edita .env y luego ejecuta 'make up'"

first-run: ## Primera ejecución completa
	@make setup
	@echo ""
	@read -p "¿Ya editaste el archivo .env? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		make up; \
		echo ""; \
		echo "✅ Aplicación iniciada!"; \
		echo "Frontend: http://localhost"; \
		echo "Backend: http://localhost:3001"; \
	else \
		echo "⚠️  Por favor edita .env y luego ejecuta 'make up'"; \
	fi

# Production deployment helpers

prod-deploy: ## Deploy en producción
	@echo "🚀 Desplegando en producción..."
	git pull
	make build
	make down
	make up
	@echo "✅ Deploy completado"

prod-update: ## Actualizar aplicación en producción
	@echo "🔄 Actualizando..."
	git pull
	make build
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Actualización completada"

health: ## Verificar salud de los servicios
	@echo "🏥 Verificando salud de servicios..."
	@echo "Backend:"
	@curl -s http://localhost:3001/health | jq . || echo "❌ Backend no responde"
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost/health || echo "❌ Frontend no responde"
	@echo ""
	@docker-compose -f $(COMPOSE_FILE) ps
