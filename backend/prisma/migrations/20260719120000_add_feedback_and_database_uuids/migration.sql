CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "FeedbackAudience" AS ENUM ('YOUTH', 'EMPLOYER', 'PARTNER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_REVIEW', 'ACTIONED', 'ARCHIVED');

-- Let PostgreSQL create UUID values instead of relying on seeded/client-side UUIDs.
ALTER TABLE "users" ALTER COLUMN "uuid" TYPE UUID USING "uuid"::uuid;
ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();

ALTER TABLE "profiles" ALTER COLUMN "uuid" TYPE UUID USING "uuid"::uuid;
ALTER TABLE "profiles" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" INTEGER,
    "audience" "FeedbackAudience" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "rating" INTEGER,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "organizationName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'api',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_uuid_key" ON "feedback"("uuid");

-- CreateIndex
CREATE INDEX "feedback_audience_status_idx" ON "feedback"("audience", "status");

-- CreateIndex
CREATE INDEX "feedback_status_createdAt_idx" ON "feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_rating_idx" ON "feedback"("rating");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
