-- CreateEnum
CREATE TYPE "EstadoApp" AS ENUM ('PENDING', 'DEPLOYING', 'RUNNING', 'STOPPED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "EstadoDeployment" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicaciones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coolifyAppId" TEXT,
    "nombre" TEXT NOT NULL,
    "repositorioGit" TEXT NOT NULL,
    "estado" "EstadoApp" NOT NULL DEFAULT 'PENDING',
    "variablesEntorno" JSONB,
    "ultimoDeployment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aplicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "aplicacionId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "estado" "EstadoDeployment" NOT NULL DEFAULT 'PENDING',
    "logs" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "aplicaciones_userId_key" ON "aplicaciones"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "aplicaciones_coolifyAppId_key" ON "aplicaciones"("coolifyAppId");

-- CreateIndex
CREATE INDEX "deployments_aplicacionId_idx" ON "deployments"("aplicacionId");

-- AddForeignKey
ALTER TABLE "aplicaciones" ADD CONSTRAINT "aplicaciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_aplicacionId_fkey" FOREIGN KEY ("aplicacionId") REFERENCES "aplicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
