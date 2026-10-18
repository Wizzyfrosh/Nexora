ALTER TABLE "email_verification_tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
-- Old verification links are intentionally retired; owners can request a code.
DELETE FROM "email_verification_tokens";
UPDATE "account_mails" SET "status" = 'CANCELLED', "encryptedToken" = '' WHERE "purpose" = 'VERIFY' AND "status" = 'PENDING';
