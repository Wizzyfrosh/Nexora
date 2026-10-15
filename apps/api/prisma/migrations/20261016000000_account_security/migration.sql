-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "familyId" TEXT;

-- CreateTable
CREATE TABLE "account_mails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_mails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_mails_status_nextAttemptAt_idx" ON "account_mails"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "account_mails_userId_idx" ON "account_mails"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_revokedAt_expiresAt_idx" ON "refresh_tokens"("familyId", "revokedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "account_mails" ADD CONSTRAINT "account_mails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mandatory security cutover: legacy bearer secrets must not remain usable or stored raw.
-- Existing users/accounts/content stay intact; owners must sign in and request fresh links.
UPDATE "refresh_tokens" SET "token" = 'legacy-invalidated:' || "id", "revokedAt" = CURRENT_TIMESTAMP, "expiresAt" = CURRENT_TIMESTAMP;
UPDATE "email_verification_tokens" SET "token" = 'legacy-invalidated:' || "id", "expiresAt" = CURRENT_TIMESTAMP;
UPDATE "password_reset_tokens" SET "token" = 'legacy-invalidated:' || "id", "usedAt" = CURRENT_TIMESTAMP, "expiresAt" = CURRENT_TIMESTAMP;
