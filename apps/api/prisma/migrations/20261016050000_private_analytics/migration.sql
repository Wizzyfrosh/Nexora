-- Additive first-party queue. Legacy session/metadata rows are not imported or deleted.
CREATE TABLE "analytics_observations" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
  "eventType" "AnalyticsEventType" NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analytics_observations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "analytics_observations_businessId_eventId_key" ON "analytics_observations"("businessId", "eventId");
CREATE INDEX "analytics_observations_businessId_receivedAt_idx" ON "analytics_observations"("businessId", "receivedAt");
CREATE INDEX "analytics_observations_businessId_status_idx" ON "analytics_observations"("businessId", "status");
CREATE INDEX "analytics_observations_status_availableAt_receivedAt_idx" ON "analytics_observations"("status", "availableAt", "receivedAt");
CREATE INDEX "analytics_observations_receivedAt_idx" ON "analytics_observations"("receivedAt");
CREATE TABLE "analytics_daily" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "day" DATE NOT NULL,
  "eventType" "AnalyticsEventType" NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analytics_daily_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "analytics_daily_businessId_day_eventType_key" ON "analytics_daily"("businessId", "day", "eventType");
CREATE INDEX "analytics_daily_day_idx" ON "analytics_daily"("day");
CREATE INDEX "leads_businessId_createdAt_idx" ON "leads"("businessId", "createdAt");
