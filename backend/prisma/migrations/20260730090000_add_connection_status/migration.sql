-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "connections" ADD COLUMN "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "connections" ADD COLUMN "respondedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "connections_connectedUserId_idx";

-- CreateIndex
CREATE INDEX "connections_connectedUserId_status_idx" ON "connections"("connectedUserId", "status");
