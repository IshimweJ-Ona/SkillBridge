-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- DropIndex
DROP INDEX "notifications_status_createdAt_idx";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "refundOfTransactionId" INTEGER;

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "jobMatchAlerts" BOOLEAN NOT NULL DEFAULT true,
    "applicationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "badgeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "contractAlerts" BOOLEAN NOT NULL DEFAULT true,
    "marketingAlerts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_uuid_key" ON "notification_preferences"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_status_createdAt_idx" ON "notifications"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_status_retryCount_idx" ON "notifications"("status", "retryCount");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_refundOfTransactionId_key" ON "transactions"("refundOfTransactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refundOfTransactionId_fkey" FOREIGN KEY ("refundOfTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

