-- Existing payment rows retain NULL snapshots and cannot auto-fulfil.
ALTER TABLE "payments"
  ADD COLUMN "billingCycle" TEXT,
  ADD COLUMN "expectedAmountKobo" INTEGER,
  ADD COLUMN "expectedEmail" TEXT,
  ADD COLUMN "fulfilledAt" TIMESTAMP(3),
  ADD COLUMN "providerPlanCode" TEXT,
  ADD COLUMN "providerTransactionId" TEXT,
  ADD COLUMN "purchasedPlan" "SubscriptionPlan";

CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "reference" TEXT,
  "providerObjectId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_events_status_nextAttemptAt_idx" ON "payment_events"("status", "nextAttemptAt");
CREATE UNIQUE INDEX "payments_providerTransactionId_key" ON "payments"("providerTransactionId");
