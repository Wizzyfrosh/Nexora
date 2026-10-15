-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billingAnchorPaymentId" TEXT,
ADD COLUMN     "cancelRequestedAt" TIMESTAMP(3),
ADD COLUMN     "nextProviderSyncAt" TIMESTAMP(3),
ADD COLUMN     "providerStatusUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "renewalStatus" TEXT NOT NULL DEFAULT 'UNLINKED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "coverageEnd" TIMESTAMP(3),
ADD COLUMN     "coverageStart" TIMESTAMP(3),
ADD COLUMN     "providerInvoiceCode" TEXT;

-- AlterTable
ALTER TABLE "payment_events" ADD COLUMN     "billingData" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_billingAnchorPaymentId_key" ON "subscriptions"("billingAnchorPaymentId");

-- CreateIndex
CREATE INDEX "subscriptions_nextProviderSyncAt_idx" ON "subscriptions"("nextProviderSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerInvoiceCode_key" ON "payments"("providerInvoiceCode");

-- CreateIndex
CREATE UNIQUE INDEX "payments_subscriptionId_coverageStart_key" ON "payments"("subscriptionId", "coverageStart");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billingAnchorPaymentId_fkey" FOREIGN KEY ("billingAnchorPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
