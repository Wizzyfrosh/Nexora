import { BadRequestException } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { PaystackCharge, PaystackSubscription } from './paystack.service';

export interface InvoiceEvidence {
  subscriptionCode: string;
  invoiceCode: string;
  reference: string;
  amount: number;
  currency: string;
  customerCode: string;
  periodStart: string;
  periodEnd: string;
  paid: boolean;
}

export type BillingEvidenceReason =
  | 'EVIDENCE_REJECTED'
  | 'SUBSCRIPTION_ID'
  | 'PROVIDER_DOMAIN'
  | 'PAYMENT_ANCHOR'
  | 'PLAN_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'CUSTOMER_MISMATCH'
  | 'PROVIDER_TIMESTAMP'
  | 'PROVIDER_TIMESTAMP_MISSING'
  | 'PROVIDER_TIMESTAMP_INVALID'
  | 'PROVIDER_TIMESTAMP_FUTURE'
  | 'PROVIDER_TIMESTAMP_CONFLICT'
  | 'PROVIDER_STATUS'
  | 'LINK_CONFLICT'
  | 'SNAPSHOT_CONFLICT'
  | 'LINK_STATUS_CONFLICT';

export class BillingEvidenceError extends BadRequestException {
  constructor(readonly reason: BillingEvidenceReason) {
    super('Billing evidence requires review');
  }
}

export function requireBilling(
  condition: unknown,
  reason: BillingEvidenceReason = 'EVIDENCE_REJECTED',
): asserts condition {
  if (!condition) throw new BillingEvidenceError(reason);
}

export function validTransactionId(id: unknown): boolean {
  return (
    (typeof id === 'string' && /^[1-9][0-9]{0,30}$/.test(id)) ||
    (typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
  );
}

export function providerSubscriptionUpdatedAt(
  data: PaystackSubscription,
  allowMissing = false,
): Date | null {
  const values: unknown[] = [data.updatedAt, data.updated_at].filter(
    (value) => value !== undefined && value !== null,
  );
  if (values.length === 0 && allowMissing) return null;
  requireBilling(values.length > 0, 'PROVIDER_TIMESTAMP_MISSING');
  const dates = values.map((value) => {
    // An explicit offset prevents the server's timezone from changing ordering.
    requireBilling(
      typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          value,
        ),
      'PROVIDER_TIMESTAMP_INVALID',
    );
    const date = new Date(value);
    requireBilling(
      Number.isFinite(date.getTime()),
      'PROVIDER_TIMESTAMP_INVALID',
    );
    requireBilling(
      date.getTime() <= Date.now() + 300000,
      'PROVIDER_TIMESTAMP_FUTURE',
    );
    return date;
  });
  requireBilling(
    dates.every((date) => date.getTime() === dates[0].getTime()),
    'PROVIDER_TIMESTAMP_CONFLICT',
  );
  return dates[0];
}

export function checkProviderSubscription(
  data: PaystackSubscription,
  anchor: Payment,
  code: string,
  expectedDomain: 'test' | 'live' = 'test',
  allowMissingTimestamp = false,
) {
  requireBilling(
    /^SUB_[A-Za-z0-9]+$/.test(code) && data.subscription_code === code,
    'SUBSCRIPTION_ID',
  );
  requireBilling(data.domain === expectedDomain, 'PROVIDER_DOMAIN');
  requireBilling(anchor.fulfilledAt && !anchor.deletedAt, 'PAYMENT_ANCHOR');
  requireBilling(
    anchor.providerPlanCode &&
      data.plan?.plan_code === anchor.providerPlanCode &&
      anchor.billingCycle === 'yearly' &&
      data.plan.interval === 'annually',
    'PLAN_MISMATCH',
  );
  requireBilling(
    data.amount === anchor.expectedAmountKobo &&
      data.plan.amount === anchor.expectedAmountKobo,
    'AMOUNT_MISMATCH',
  );
  requireBilling(data.plan.currency === anchor.currency, 'CURRENCY_MISMATCH');
  requireBilling(
    data.customer?.customer_code &&
      data.customer?.email?.trim().toLowerCase() === anchor.expectedEmail,
    'CUSTOMER_MISMATCH',
  );
  providerSubscriptionUpdatedAt(data, allowMissingTimestamp);
  requireBilling(
    ['active', 'non-renewing', 'attention', 'cancelled', 'completed'].includes(
      data.status,
    ),
    'PROVIDER_STATUS',
  );
}

export function checkInvoice(
  invoice: InvoiceEvidence,
  charge: PaystackCharge,
  anchor: Payment,
  customerCode: string,
) {
  const start = new Date(invoice.periodStart),
    end = new Date(invoice.periodEnd),
    paid = new Date(charge.paid_at);
  const anniversary = new Date(start);
  const month = anniversary.getUTCMonth();
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  if (anniversary.getUTCMonth() !== month) anniversary.setUTCDate(0);
  requireBilling(
    invoice.paid &&
      /^INV_[A-Za-z0-9]+$/.test(invoice.invoiceCode) &&
      invoice.reference === charge.reference &&
      charge.status === 'success' &&
      validTransactionId(charge.id) &&
      invoice.amount === anchor.expectedAmountKobo &&
      charge.amount === anchor.expectedAmountKobo &&
      invoice.currency === anchor.currency &&
      charge.currency === anchor.currency &&
      invoice.customerCode === customerCode &&
      charge.customer?.customer_code === customerCode &&
      charge.customer?.email?.trim().toLowerCase() === anchor.expectedEmail &&
      Number.isFinite(start.getTime()) &&
      Number.isFinite(end.getTime()) &&
      Number.isFinite(paid.getTime()) &&
      Math.abs(end.getTime() - anniversary.getTime()) <= 300000 &&
      start.getTime() <= Date.now() + 300000 &&
      paid.getTime() <= Date.now() + 300000 &&
      Math.abs(paid.getTime() - start.getTime()) <= 7 * 86400000,
  );
  return { start, end, paid };
}
