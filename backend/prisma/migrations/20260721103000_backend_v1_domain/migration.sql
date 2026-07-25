-- Backend V1 domain expansion for SkillBridge.

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ChallengeAudience" AS ENUM ('UNIVERSITY_GRADUATES', 'ALL_YOUTH');
CREATE TYPE "ChallengeDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "ChallengeSubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'REVIEW_REQUIRED', 'EXPIRED');
CREATE TYPE "BadgeStatus" AS ENUM ('ISSUED', 'REVOKED');
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'ARCHIVED');
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'OFFER_EXTENDED', 'HIRED');
CREATE TYPE "PricingType" AS ENUM ('FIXED', 'HOURLY');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'IN_DISCUSSION', 'ACCEPTED', 'DECLINED', 'CONTRACTED', 'COMPLETED');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DELIVERED', 'COMPLETED', 'CANCELED', 'DISPUTED');
CREATE TYPE "TransactionType" AS ENUM ('SUBSCRIPTION', 'HIRING_FEE', 'FREELANCE_ESCROW', 'REFUND');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "DataExportStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PAYMENT', 'SYSTEM');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "location" TEXT,
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN "deletionScheduledAt" TIMESTAMP(3),
  ADD COLUMN "consentVersion" TEXT,
  ADD COLUMN "consentAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "companies" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ownerUserId" INTEGER,
  "verifiedByUserId" INTEGER,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sector" TEXT,
  "location" TEXT,
  "website" TEXT,
  "logoUrl" TEXT,
  "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_challenges" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "skillCategory" TEXT NOT NULL,
  "difficulty" "ChallengeDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "audience" "ChallengeAudience" NOT NULL DEFAULT 'ALL_YOUTH',
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
  "questions" JSONB NOT NULL DEFAULT '[]',
  "resources" JSONB NOT NULL DEFAULT '[]',
  "reviewerDueHours" INTEGER NOT NULL DEFAULT 72,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skill_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "challenge_submissions" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challengeId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "status" "ChallengeSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "responseText" TEXT,
  "responseUrl" TEXT,
  "responses" JSONB NOT NULL DEFAULT '{}',
  "score" INTEGER,
  "feedback" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "autoSavedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_badges" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "challengeId" INTEGER NOT NULL,
  "companyId" INTEGER NOT NULL,
  "submissionId" INTEGER,
  "name" TEXT NOT NULL,
  "skillName" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "status" "BadgeStatus" NOT NULL DEFAULT 'ISSUED',
  "verifyUrl" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skill_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "peer_endorsements" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "profileId" INTEGER NOT NULL,
  "endorsedByUserId" INTEGER NOT NULL,
  "skill" TEXT NOT NULL,
  "comment" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "peer_endorsements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_postings" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" INTEGER NOT NULL,
  "preScreenChallengeId" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "compensationRange" TEXT,
  "location" TEXT,
  "deadline" TIMESTAMP(3),
  "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
  "placementConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_applications" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "coverLetter" TEXT,
  "documentUrl" TEXT,
  "matchScore" INTEGER,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_matches" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "badgeScore" INTEGER NOT NULL,
  "brandScore" INTEGER NOT NULL,
  "subscribed" BOOLEAN NOT NULL DEFAULT false,
  "notificationDueAt" TIMESTAMP(3) NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "freelance_listings" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "pricingType" "PricingType" NOT NULL DEFAULT 'FIXED',
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RWF',
  "timelineDays" INTEGER NOT NULL,
  "portfolioUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "freelance_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_requests" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listingId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "requirements" TEXT NOT NULL,
  "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_contracts" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listingId" INTEGER NOT NULL,
  "requestId" INTEGER NOT NULL,
  "freelancerId" INTEGER NOT NULL,
  "clientUserId" INTEGER,
  "terms" TEXT NOT NULL,
  "deliverables" TEXT NOT NULL,
  "timelineDays" INTEGER NOT NULL,
  "feeCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RWF',
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "acceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "freelance_reviews" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listingId" INTEGER NOT NULL,
  "contractId" INTEGER NOT NULL,
  "reviewerUserId" INTEGER,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "response" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "freelance_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "freelance_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE "transactions" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER,
  "employerId" INTEGER,
  "jobId" INTEGER,
  "contractId" INTEGER,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RWF',
  "provider" TEXT NOT NULL DEFAULT 'stripe-demo',
  "providerReference" TEXT,
  "failureReason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "disputes" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transactionId" INTEGER NOT NULL,
  "contractId" INTEGER,
  "raisedByUserId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'DISPUTED',
  "decision" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER,
  "email" TEXT,
  "type" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'sendgrid',
  "providerMessageId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" INTEGER,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityUuid" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_exports" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestedByUserId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
  "filters" JSONB NOT NULL DEFAULT '{}',
  "fileUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_export_requests" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "status" "DataExportStatus" NOT NULL DEFAULT 'REQUESTED',
  "fileUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_verifications" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "codeHash" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_consents" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" INTEGER NOT NULL,
  "version" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "ipAddress" TEXT,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "companies_uuid_key" ON "companies"("uuid");
CREATE INDEX "companies_status_idx" ON "companies"("status");
CREATE INDEX "companies_sector_idx" ON "companies"("sector");
CREATE UNIQUE INDEX "skill_challenges_uuid_key" ON "skill_challenges"("uuid");
CREATE INDEX "skill_challenges_status_sector_idx" ON "skill_challenges"("status", "sector");
CREATE INDEX "skill_challenges_skillCategory_difficulty_idx" ON "skill_challenges"("skillCategory", "difficulty");
CREATE UNIQUE INDEX "challenge_submissions_uuid_key" ON "challenge_submissions"("uuid");
CREATE INDEX "challenge_submissions_challengeId_userId_idx" ON "challenge_submissions"("challengeId", "userId");
CREATE INDEX "challenge_submissions_status_submittedAt_idx" ON "challenge_submissions"("status", "submittedAt");
CREATE UNIQUE INDEX "skill_badges_uuid_key" ON "skill_badges"("uuid");
CREATE UNIQUE INDEX "skill_badges_submissionId_key" ON "skill_badges"("submissionId");
CREATE INDEX "skill_badges_userId_status_idx" ON "skill_badges"("userId", "status");
CREATE INDEX "skill_badges_skillName_idx" ON "skill_badges"("skillName");
CREATE UNIQUE INDEX "peer_endorsements_uuid_key" ON "peer_endorsements"("uuid");
CREATE UNIQUE INDEX "peer_endorsements_profileId_endorsedByUserId_skill_key" ON "peer_endorsements"("profileId", "endorsedByUserId", "skill");
CREATE INDEX "peer_endorsements_skill_idx" ON "peer_endorsements"("skill");
CREATE UNIQUE INDEX "job_postings_uuid_key" ON "job_postings"("uuid");
CREATE INDEX "job_postings_status_deadline_idx" ON "job_postings"("status", "deadline");
CREATE INDEX "job_postings_companyId_idx" ON "job_postings"("companyId");
CREATE UNIQUE INDEX "job_applications_uuid_key" ON "job_applications"("uuid");
CREATE UNIQUE INDEX "job_applications_jobId_userId_key" ON "job_applications"("jobId", "userId");
CREATE INDEX "job_applications_status_submittedAt_idx" ON "job_applications"("status", "submittedAt");
CREATE UNIQUE INDEX "job_matches_uuid_key" ON "job_matches"("uuid");
CREATE UNIQUE INDEX "job_matches_jobId_userId_key" ON "job_matches"("jobId", "userId");
CREATE INDEX "job_matches_notificationDueAt_notifiedAt_idx" ON "job_matches"("notificationDueAt", "notifiedAt");
CREATE INDEX "job_matches_score_idx" ON "job_matches"("score");
CREATE UNIQUE INDEX "freelance_listings_uuid_key" ON "freelance_listings"("uuid");
CREATE INDEX "freelance_listings_status_category_idx" ON "freelance_listings"("status", "category");
CREATE UNIQUE INDEX "service_requests_uuid_key" ON "service_requests"("uuid");
CREATE INDEX "service_requests_status_createdAt_idx" ON "service_requests"("status", "createdAt");
CREATE UNIQUE INDEX "service_contracts_uuid_key" ON "service_contracts"("uuid");
CREATE UNIQUE INDEX "service_contracts_requestId_key" ON "service_contracts"("requestId");
CREATE INDEX "service_contracts_status_createdAt_idx" ON "service_contracts"("status", "createdAt");
CREATE UNIQUE INDEX "freelance_reviews_uuid_key" ON "freelance_reviews"("uuid");
CREATE UNIQUE INDEX "freelance_reviews_contractId_key" ON "freelance_reviews"("contractId");
CREATE INDEX "freelance_reviews_rating_idx" ON "freelance_reviews"("rating");
CREATE UNIQUE INDEX "transactions_uuid_key" ON "transactions"("uuid");
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");
CREATE UNIQUE INDEX "disputes_uuid_key" ON "disputes"("uuid");
CREATE INDEX "disputes_status_createdAt_idx" ON "disputes"("status", "createdAt");
CREATE UNIQUE INDEX "notifications_uuid_key" ON "notifications"("uuid");
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE UNIQUE INDEX "audit_logs_uuid_key" ON "audit_logs"("uuid");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX "audit_logs_entityType_entityUuid_idx" ON "audit_logs"("entityType", "entityUuid");
CREATE UNIQUE INDEX "report_exports_uuid_key" ON "report_exports"("uuid");
CREATE INDEX "report_exports_type_status_idx" ON "report_exports"("type", "status");
CREATE UNIQUE INDEX "data_export_requests_uuid_key" ON "data_export_requests"("uuid");
CREATE INDEX "data_export_requests_status_createdAt_idx" ON "data_export_requests"("status", "createdAt");
CREATE UNIQUE INDEX "identity_verifications_uuid_key" ON "identity_verifications"("uuid");
CREATE INDEX "identity_verifications_userId_expiresAt_idx" ON "identity_verifications"("userId", "expiresAt");
CREATE UNIQUE INDEX "password_reset_tokens_uuid_key" ON "password_reset_tokens"("uuid");
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt");
CREATE UNIQUE INDEX "user_consents_uuid_key" ON "user_consents"("uuid");
CREATE INDEX "user_consents_version_acceptedAt_idx" ON "user_consents"("version", "acceptedAt");
CREATE INDEX "users_status_deletionScheduledAt_idx" ON "users"("status", "deletionScheduledAt");
CREATE INDEX "users_lockedUntil_idx" ON "users"("lockedUntil");

-- Foreign keys
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "skill_challenges" ADD CONSTRAINT "skill_challenges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "skill_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "skill_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "challenge_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "peer_endorsements" ADD CONSTRAINT "peer_endorsements_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "peer_endorsements" ADD CONSTRAINT "peer_endorsements_endorsedByUserId_fkey" FOREIGN KEY ("endorsedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_preScreenChallengeId_fkey" FOREIGN KEY ("preScreenChallengeId") REFERENCES "skill_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freelance_listings" ADD CONSTRAINT "freelance_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "freelance_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "freelance_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "freelance_reviews" ADD CONSTRAINT "freelance_reviews_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "freelance_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freelance_reviews" ADD CONSTRAINT "freelance_reviews_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
