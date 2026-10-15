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

export function requireBilling(condition: unknown): asserts condition {
  if (!condition)
    throw new BadRequestException('Billing evidence requires review');
}

export function validTransactionId(id: unknown): boolean {
  return (
    (typeof id === 'string' && /^[1-9][0-9]{0,30}$/.test(id)) ||
    (typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
  );
}

export function checkProviderSubscription(
  data: PaystackSubscription,
  anchor: Payment,
  code: string,
) {
  requireBilling(
    /^SUB_[A-Za-z0-9]+$/.test(code) &&
      data.subscription_code === code &&
      data.domain === 'test' &&
      anchor.fulfilledAt &&
      !anchor.deletedAt &&
      anchor.providerPlanCode &&
      data.plan?.plan_code === anchor.providerPlanCode &&
      anchor.billingCycle === 'yearly' &&
      data.plan.interval === 'annually' &&
      data.amount === anchor.expectedAmountKobo &&
      data.plan.amount === anchor.expectedAmountKobo &&
      data.plan.currency === anchor.currency &&
      data.customer?.customer_code &&
      data.customer?.email?.trim().toLowerCase() === anchor.expectedEmail &&
      Number.isFinite(new Date(data.updatedAt).getTime()) &&
      new Date(data.updatedAt).getTime() <= Date.now() + 300000 &&
      [
        'active',
        'non-renewing',
        'attention',
        'cancelled',
        'completed',
      ].includes(data.status),
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
