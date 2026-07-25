ALTER TABLE "notifications" ALTER COLUMN "provider" SET DEFAULT 'resend';

UPDATE "notifications"
SET "provider" = 'resend'
WHERE "provider" = 'sendgrid';
