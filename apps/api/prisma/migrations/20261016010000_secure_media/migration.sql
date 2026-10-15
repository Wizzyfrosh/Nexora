-- Existing unverified URLs are not silently promoted to verified media.
ALTER TABLE "media" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "assetId" TEXT, ADD COLUMN "cleanupAt" TIMESTAMP(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "media_assetId_key" ON "media"("assetId");
CREATE INDEX "media_businessId_status_idx" ON "media"("businessId", "status");
CREATE INDEX "media_status_cleanupAt_idx" ON "media"("status", "cleanupAt");
