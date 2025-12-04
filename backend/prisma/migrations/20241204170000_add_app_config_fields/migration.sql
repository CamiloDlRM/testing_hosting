-- CreateEnum
CREATE TYPE "TipoAplicacion" AS ENUM ('NIXPACKS', 'STATIC', 'DOCKERFILE', 'DOCKER_COMPOSE');

-- AlterTable
ALTER TABLE "aplicaciones" ADD COLUMN     "ramaBranch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN     "tipoAplicacion" "TipoAplicacion" NOT NULL DEFAULT 'NIXPACKS',
ADD COLUMN     "buildPack" TEXT NOT NULL DEFAULT 'nixpacks',
ADD COLUMN     "puerto" INTEGER NOT NULL DEFAULT 3000,
ADD COLUMN     "installCommand" TEXT,
ADD COLUMN     "buildCommand" TEXT,
ADD COLUMN     "startCommand" TEXT,
ADD COLUMN     "baseDirectory" TEXT,
ADD COLUMN     "publishDirectory" TEXT;
