-- DropIndex: Remove unique constraint on userId (1 user can have multiple apps)
DROP INDEX IF EXISTS "aplicaciones_userId_key";

-- CreateIndex: Replace with a regular index for query performance
CREATE INDEX IF NOT EXISTS "aplicaciones_userId_idx" ON "aplicaciones"("userId");

-- AlterTable: Add resource limit columns
ALTER TABLE "aplicaciones"
ADD COLUMN IF NOT EXISTS "limiteMemoria" TEXT DEFAULT '512m',
ADD COLUMN IF NOT EXISTS "limiteCpu" TEXT DEFAULT '0.5';
