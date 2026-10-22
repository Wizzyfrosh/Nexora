import {
  checkInvoice,
  checkProviderSubscription,
  validTransactionId,
  BillingEvidenceError,
  providerSubscriptionUpdatedAt,
} from './billing-policy';
import { Payment } from '@prisma/client';
import { PaystackCharge, PaystackSubscription } from './paystack.service';

describe('Recurring billing evidence', () => {
  const anchor = {
    fulfilledAt: new Date(),
    expectedAmountKobo: 5000000,
    expectedEmail: 'owner@test.dev',
    providerPlanCode: 'PLN_test',
    billingCycle: 'yearly',
    currency: 'NGN',
  } as Payment;
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const invoice = {
    subscriptionCode: 'SUB_test',
    invoiceCode: 'INV_test',
    reference: 'renewal',
    amount: 5000000,
    currency: 'NGN',
    customerCode: 'CUS_test',
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    paid: true,
  };
  const charge = {
    id: 123,
    status: 'success',
    reference: 'renewal',
    amount: 5000000,
    currency: 'NGN',
    paid_at: start.toISOString(),
    customer: { email: 'owner@test.dev', customer_code: 'CUS_test' },
  } as PaystackCharge;
  const sub = {
    subscription_code: 'SUB_test',
    domain: 'test',
    status: 'active',
    amount: 5000000,
    updatedAt: new Date().toISOString(),
    customer: charge.customer,
    plan: {
      plan_code: 'PLN_test',
      amount: 5000000,
      currency: 'NGN',
      interval: 'annually',
    },
  } as PaystackSubscription;
  it('accepts complete provider and invoice evidence', () => {
    expect(() =>
      checkProviderSubscription(sub, anchor, 'SUB_test'),
    ).not.toThrow();
    expect(checkInvoice(invoice, charge, anchor, 'CUS_test').end).toEqual(end);
  });
  it('uses the same provider instant for camel and snake case timestamps', () => {
    const snake = { ...sub, updatedAt: undefined, updated_at: sub.updatedAt };
    expect(providerSubscriptionUpdatedAt(snake)).toEqual(
      new Date(sub.updatedAt!),
    );
    expect(() =>
      checkProviderSubscription(snake, anchor, 'SUB_test'),
    ).not.toThrow();
    expect(
      providerSubscriptionUpdatedAt({ ...sub, updated_at: sub.updatedAt }),
    ).toEqual(new Date(sub.updatedAt!));
  });
  it.each([
    [{ updatedAt: undefined }, 'PROVIDER_TIMESTAMP_MISSING'],
    [{ updatedAt: null }, 'PROVIDER_TIMESTAMP_MISSING'],
    [{ updatedAt: '2026-01-01T12:00:00' }, 'PROVIDER_TIMESTAMP_INVALID'],
    [{ updatedAt: 123 }, 'PROVIDER_TIMESTAMP_INVALID'],
    [
      { updatedAt: new Date(Date.now() + 600000).toISOString() },
      'PROVIDER_TIMESTAMP_FUTURE',
    ],
    [{ updated_at: '2020-01-01T00:00:00Z' }, 'PROVIDER_TIMESTAMP_CONFLICT'],
  ])(
    'rejects unsafe timestamp representations without substituting local time',
    (change, reason) => {
      try {
        providerSubscriptionUpdatedAt({
          ...sub,
          ...change,
        } as PaystackSubscription);
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(BillingEvidenceError);
        expect((error as BillingEvidenceError).reason).toBe(reason);
      }
    },
  );
  it.each([
    [{ domain: 'live' }, 'PROVIDER_DOMAIN'],
    [{ amount: 1 }, 'AMOUNT_MISMATCH'],
    [{ updatedAt: 'invalid' }, 'PROVIDER_TIMESTAMP_INVALID'],
    [
      {
        customer: { email: 'private@example.test', customer_code: 'CUS_other' },
      },
      'CUSTOMER_MISMATCH',
    ],
  ])(
    'reports a fixed reason while preserving the generic public error',
    (change, reason) => {
      try {
        checkProviderSubscription({ ...sub, ...change }, anchor, 'SUB_test');
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(BillingEvidenceError);
        const evidence = error as BillingEvidenceError;
        expect(evidence.reason).toBe(reason);
        expect(JSON.stringify(evidence.getResponse())).not.toContain(
          'private@example.test',
        );
        expect(evidence.message).toBe('Billing evidence requires review');
      }
    },
  );
  it('enforces payment-provider environment when linking recurring payments', () => {
    const live = { ...sub, domain: 'live' };
    expect(() =>
      checkProviderSubscription(live, anchor, 'SUB_test', 'live'),
    ).not.toThrow();
    expect(() =>
      checkProviderSubscription(live, anchor, 'SUB_test', 'test'),
    ).toThrow();
    expect(() =>
      checkProviderSubscription(sub, anchor, 'SUB_test', 'live'),
    ).toThrow();
  });
  it.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'AUTH_test', '0'])(
    'rejects invalid transaction IDs %s',
    (id) => {
      expect(validTransactionId(id)).toBe(false);
    },
  );
  it.each([
    { paid: false },
    { amount: 1 },
    { currency: 'USD' },
    { reference: 'other' },
    { customerCode: 'CUS_other' },
    { periodStart: 'invalid' },
    { periodEnd: '2099-01-01' },
  ])('rejects invalid invoice %j', (change) => {
    expect(() =>
      checkInvoice({ ...invoice, ...change }, charge, anchor, 'CUS_test'),
    ).toThrow('requires review');
  });
  it.each([
    { subscription_code: 'SUB_other' },
    { domain: 'live' },
    { amount: 1 },
    { status: 'unknown' },
    { plan: { ...sub.plan, interval: 'monthly' } },
    { customer: { email: 'other@test.dev', customer_code: 'CUS_test' } },
  ])('rejects invalid subscription %j', (change) => {
    expect(() =>
      checkProviderSubscription({ ...sub, ...change }, anchor, 'SUB_test'),
    ).toThrow('requires review');
  });
});
