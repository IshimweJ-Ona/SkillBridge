-- AlterEnum
ALTER TYPE "ChallengeSubmissionStatus" ADD VALUE 'INTEGRITY_FAILED';

-- AlterTable
ALTER TABLE "challenge_submissions" ADD COLUMN "lockedUntil" TIMESTAMP(3);
