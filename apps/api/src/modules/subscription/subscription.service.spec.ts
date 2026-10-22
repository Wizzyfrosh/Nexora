import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { AuthRepository } from '../auth/auth.repository';
import { BusinessService } from '../business/business.service';
import { SubscriptionPlan } from '@nexora/shared-types';
import { BillingLifecycleService } from './billing-lifecycle.service';

describe('Subscription purchase policy', () => {
  const ref = 'nexora-test';
  let repo: Record<string, jest.Mock>;
  let provider: Record<string, jest.Mock>;
  let service: SubscriptionService;
  let purchase: any;
  let charge: any;
  beforeEach(() => {
    purchase = {
      subscriptionId: 'sub',
      paystackReference: ref,
      currency: 'NGN',
      expectedAmountKobo: 5000000,
      expectedEmail: 'owner@example.test',
      purchasedPlan: 'BASIC',
      billingCycle: 'yearly',
      createdAt: new Date(),
      subscription: { businessId: 'business', business: { ownerId: 'owner' } },
    };
    charge = {
      id: 123,
      status: 'success',
      reference: ref,
      currency: 'NGN',
      amount: 5000000,
      paid_at: new Date().toISOString(),
      metadata: { businessId: 'business', planName: 'BASIC' },
      customer: { email: 'owner@example.test', customer_code: 'CUS_test' },
    };
    repo = {
      findPayment: jest.fn().mockResolvedValue(purchase),
      billingHistory: jest.fn().mockResolvedValue([]),
      fulfill: jest.fn(),
      findByBusinessId: jest
        .fn()
        .mockResolvedValue({ id: 'sub', status: 'TRIAL' }),
      findPlanByName: jest.fn().mockResolvedValue({
        name: 'BASIC',
        priceNgn: 50000,
        billingCycle: 'yearly',
        paystackPlanCode: 'PLN_test',
      }),
      createPayment: jest.fn(),
      receiveEvent: jest.fn(),
      expire: jest.fn(),
      dueEvents: jest.fn().mockResolvedValue([]),
      hasReviewEvents: jest.fn().mockResolvedValue(false),
      claimEvent: jest.fn().mockResolvedValue({ count: 1 }),
      finishEvent: jest.fn(),
      retryEvent: jest.fn(),
      enqueueProviderSyncs: jest.fn(),
    };
    provider = {
      verifyTransaction: jest.fn().mockResolvedValue({ data: charge }),
      initializeTransaction: jest.fn(),
      assertCheckoutEnabled: jest.fn(),
      validateWebhookSignature: jest.fn().mockReturnValue(true),
    };
    service = new SubscriptionService(
      repo as unknown as SubscriptionRepository,
      provider as unknown as PaystackService,
      {
        findUserById: jest
          .fn()
          .mockResolvedValue({ email: 'owner@example.test' }),
      } as unknown as AuthRepository,
      {
        getBusinessProfile: jest.fn().mockResolvedValue({ ownerId: 'owner' }),
      } as unknown as BusinessService,
      new ConfigService({ frontendUrl: 'http://localhost:3000' }),
      {
        process: jest.fn().mockResolvedValue(false),
      } as unknown as BillingLifecycleService,
    );
  });

  it('does not register a web recovery timer when cron owns the queue', () => {
    const timerSpy = jest.spyOn(global, 'setInterval');
    const scheduled = new SubscriptionService(
      repo as unknown as SubscriptionRepository,
      provider as unknown as PaystackService,
      {} as AuthRepository, {} as BusinessService,
      new ConfigService({ billing: { workerMode: 'scheduled' } }),
      {} as BillingLifecycleService,
    );
    try {
      scheduled.onModuleInit();
      expect(timerSpy).not.toHaveBeenCalled();
    } finally {
      scheduled.onModuleDestroy();
      timerSpy.mockRestore();
    }
  });
  it('fails the scheduled run when event recovery is deferred', async () => {
    repo.dueEvents.mockResolvedValue([
      { id: 'event', event: 'charge.success', reference: ref, attempts: 0 },
    ]);
    provider.verifyTransaction.mockRejectedValue(new Error('provider timeout'));
    await expect(service.recoverPendingEvents(true))
      .rejects.toThrow('Billing recovery failed');
    expect(repo.retryEvent).toHaveBeenCalledWith('event', 1);
  });
  it('surfaces database failures to the scheduled worker', async () => {
    repo.expire.mockRejectedValue(new Error('database unavailable'));
    await expect(service.recoverPendingEvents(true))
      .rejects.toThrow('Billing recovery failed');
  });
  it('keeps scheduled runs failing while earlier manual-review events remain', async () => {
    repo.hasReviewEvents.mockResolvedValue(true);
    await expect(service.recoverPendingEvents(true))
      .rejects.toThrow('Billing recovery failed');
    expect(repo.finishEvent).not.toHaveBeenCalled();
    expect(repo.retryEvent).not.toHaveBeenCalled();
    repo.hasReviewEvents.mockResolvedValue(false);
    await expect(service.recoverPendingEvents(true)).resolves.toBeUndefined();
  });
  it('does not report a healthy scheduled pass when review inspection fails', async () => {
    repo.hasReviewEvents.mockRejectedValue(new Error('database unavailable'));
    await expect(service.recoverPendingEvents(true))
      .rejects.toThrow('Billing recovery failed');
  });
  it('limits owner payment-history access and excludes internal metadata', async () => {
    await expect(service.billingHistory('stranger', 'business')).rejects.toThrow('Business not found');
    expect(repo.billingHistory).not.toHaveBeenCalled();
    repo.billingHistory.mockResolvedValue([{ paystackReference: 'nexora-test', paystackStatus: 'SUCCESS', amountNgn: 50000, currency: 'NGN', purchasedPlan: 'BASIC', paidAt: new Date('2026-10-01T00:00:00Z'), createdAt: new Date('2026-09-30T00:00:00Z'), coverageStart: null, coverageEnd: null, fulfilledAt: new Date(), expectedEmail: 'private@example.test', metadata: { authorization: 'not public' } }]);
    const history = await service.billingHistory('owner', 'business');
    expect(history).toHaveLength(1);
    expect(history[0].verified).toBe(true);
    expect(JSON.stringify(history)).not.toContain('private@example.test');
    expect(JSON.stringify(history)).not.toContain('authorization');
  });
  it('permits a cancellation request even when new checkout is disabled', async () => {
    repo.requestCancellation = jest.fn().mockResolvedValue({ status: 'PENDING' });
    await expect(service.cancelRenewal('owner', 'business')).resolves.toEqual({ status: 'PENDING' });
    expect(provider.assertCheckoutEnabled).not.toHaveBeenCalled();
  });
  it('checks ownership before any provider request', async () => {
    await expect(service.verifyPayment('stranger', ref)).rejects.toThrow(
      'Payment not found',
    );
    expect(provider.verifyTransaction).not.toHaveBeenCalled();
  });
  it('verifies a known purchase and delegates atomic fulfilment', async () => {
    expect((await service.verifyPayment('owner', ref)).success).toBe(true);
    expect(repo.fulfill).toHaveBeenCalledWith(ref, charge);
  });
  it.each([
    { amount: 1 },
    { currency: 'USD' },
    { reference: 'other' },
    { status: 'failed' },
    { customer: { email: 'other@example.test', customer_code: 'CUS_wrong' } },
    { customer: {} },
    { metadata: { businessId: 'other', planName: 'BASIC' } },
    { metadata: null },
    { paid_at: 'invalid' },
    { paid_at: '2099-01-01' },
    { id: null },
  ])('rejects mismatched provider details: %j', async (override) => {
    Object.assign(charge, override);
    await expect(service.verifyPayment('owner', ref)).rejects.toThrow(
      'details do not match',
    );
    expect(repo.fulfill).not.toHaveBeenCalled();
  });
  it('does not auto-fulfil historical purchases without snapshots', async () => {
    purchase.expectedAmountKobo = null;
    await expect(service.verifyPayment('owner', ref)).rejects.toThrow();
    expect(repo.fulfill).not.toHaveBeenCalled();
  });
  it('returns recorded success on replay without touching entitlement', async () => {
    purchase.fulfilledAt = new Date();
    await service.verifyPayment('owner', ref);
    expect(provider.verifyTransaction).not.toHaveBeenCalled();
    expect(repo.fulfill).not.toHaveBeenCalled();
  });
  it('rejects callback URLs outside the configured origin', async () => {
    await expect(
      service.initiateSubscription('owner', 'business', {
        plan: SubscriptionPlan.BASIC,
        callbackUrl: 'https://attacker.test/return',
      }),
    ).rejects.toThrow('Invalid callback');
    expect(repo.createPayment).not.toHaveBeenCalled();
  });
  it('persists a recoverable snapshot before provider initialization, including timeout', async () => {
    provider.initializeTransaction.mockRejectedValue(new Error('Timeout'));
    await expect(
      service.initiateSubscription('owner', 'business', {
        plan: SubscriptionPlan.BASIC,
        callbackUrl: 'http://localhost:3000/dashboard/subscription',
      }),
    ).rejects.toThrow('Timeout');
    expect(repo.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedAmountKobo: 5000000,
        expectedEmail: 'owner@example.test',
        purchasedPlan: 'BASIC',
        paystackReference: expect.stringMatching(/^nexora-/),
      }),
    );
    expect(repo.createPayment.mock.invocationCallOrder[0]).toBeLessThan(
      provider.initializeTransaction.mock.invocationCallOrder[0],
    );
  });
  it('blocks direct Premium checkout before any payment row or provider call', async () => {
    await expect(service.initiateSubscription('owner', 'business', {
      plan: SubscriptionPlan.PREMIUM,
      callbackUrl: 'http://localhost:3000/dashboard/billing',
    })).rejects.toThrow('Premium checkout is not released');
    expect(repo.createPayment).not.toHaveBeenCalled();
    expect(provider.initializeTransaction).not.toHaveBeenCalled();
  });
  it('rejects trial checkout', async () => {
    await expect(
      service.initiateSubscription('owner', 'business', {
        plan: SubscriptionPlan.TRIAL,
        callbackUrl: 'http://localhost:3000/dashboard',
      }),
    ).rejects.toThrow('Unsupported plan');
  });
  it('does not acknowledge receipt if the database write fails', async () => {
    repo.receiveEvent.mockRejectedValue(new Error('Database down'));
    await expect(
      service.handleWebhook(
        'signature',
        Buffer.from('{"event":"charge.success","data":{"reference":"x"}}'),
      ),
    ).rejects.toThrow('Database down');
  });
  it('retries durable work when verification fails, without claiming success', async () => {
    repo.dueEvents.mockResolvedValue([
      { id: 'event', event: 'charge.success', reference: ref, attempts: 0 },
    ]);
    provider.verifyTransaction.mockRejectedValue(new Error('private provider response and token'));
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      await service.recoverPendingEvents();
      expect(warn).toHaveBeenCalledWith(
        'Payment event deferred at INITIAL_VERIFICATION_OR_INTERNAL; inspect pending/review inbox',
      );
    } finally {
      warn.mockRestore();
    }
    expect(repo.retryEvent).toHaveBeenCalledWith('event', 1);
    expect(repo.finishEvent).not.toHaveBeenCalled();
  });
  it('quarantines lifecycle events without removing paid access', async () => {
    repo.dueEvents.mockResolvedValue([
      { id: 'event', event: 'subscription.disable', attempts: 0 },
    ]);
    await service.recoverPendingEvents();
    expect(repo.finishEvent).toHaveBeenCalledWith('event', 'REVIEW');
    expect(repo.fulfill).not.toHaveBeenCalled();
  });
});
