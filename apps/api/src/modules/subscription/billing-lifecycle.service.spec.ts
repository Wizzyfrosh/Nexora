import { PaymentEvent } from '@prisma/client';
import {
  BillingLifecycleService,
  BillingRecoveryError,
} from './billing-lifecycle.service';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { BillingEvidenceError } from './billing-policy';

describe('Billing recovery diagnostics', () => {
  const event = {
    event: 'subscription.create',
    providerObjectId: 'SUB_test',
    billingData: {},
  } as PaymentEvent;
  const verify = jest.fn();

  function setup() {
    const repo = {
      findLinked: jest.fn().mockResolvedValue(null),
      linkAndSync: jest.fn(),
      subscriptionSnapshotVersion: jest.fn().mockResolvedValue('123'),
    };
    const provider = {
      fetchSubscription: jest
        .fn()
        .mockResolvedValue({ data: { subscription_code: 'SUB_test' } }),
      expectedDomain: jest.fn().mockReturnValue('test'),
    };
    return {
      repo,
      provider,
      service: new BillingLifecycleService(
        repo as unknown as SubscriptionRepository,
        provider as unknown as PaystackService,
      ),
    };
  }

  it('redacts provider exceptions while identifying the failed provider read', async () => {
    const { service, provider } = setup();
    provider.fetchSubscription.mockRejectedValue(
      new Error('secret-token owner@example.test'),
    );
    await expect(service.process(event, verify)).rejects.toEqual(
      new BillingRecoveryError('PROVIDER_READ'),
    );
  });

  it('identifies missing authoritative payment evidence without linking or granting access', async () => {
    const { service, repo } = setup();
    await expect(service.process(event, verify)).rejects.toEqual(
      new BillingRecoveryError('PAYMENT_ANCHOR', 'EVIDENCE_REJECTED'),
    );
    expect(repo.linkAndSync).not.toHaveBeenCalled();
  });

  it('distinguishes subscription policy failures from missing payment anchors', async () => {
    const { service, repo } = setup();
    repo.findLinked.mockResolvedValue({
      billingAnchorPayment: { fulfilledAt: new Date() },
    });
    repo.linkAndSync.mockRejectedValue(new Error('private provider evidence'));
    await expect(service.process(event, verify)).rejects.toEqual(
      new BillingRecoveryError('SUBSCRIPTION_LINK'),
    );
  });
  it('re-reads the provider after a transient snapshot conflict', async () => {
    const { service, repo, provider } = setup();
    repo.findLinked.mockResolvedValue({
      billingAnchorPayment: { fulfilledAt: new Date() },
    });
    repo.linkAndSync
      .mockRejectedValueOnce(new BillingEvidenceError('SNAPSHOT_CONFLICT'))
      .mockResolvedValue(undefined);
    await expect(service.process(event, verify)).resolves.toBe(true);
    expect(provider.fetchSubscription).toHaveBeenCalledTimes(2);
    expect(repo.subscriptionSnapshotVersion).toHaveBeenCalledTimes(2);
  });
  it('bounds conflicts and leaves permanent policy errors to durable review', async () => {
    const { service, repo, provider } = setup();
    repo.findLinked.mockResolvedValue({
      billingAnchorPayment: { fulfilledAt: new Date() },
    });
    repo.linkAndSync.mockRejectedValue(
      new BillingEvidenceError('SNAPSHOT_CONFLICT'),
    );
    await expect(service.process(event, verify)).rejects.toMatchObject({
      reason: 'SNAPSHOT_CONFLICT',
    });
    expect(provider.fetchSubscription).toHaveBeenCalledTimes(3);
    provider.fetchSubscription.mockClear();
    repo.linkAndSync.mockRejectedValue(
      new BillingEvidenceError('CUSTOMER_MISMATCH'),
    );
    await expect(service.process(event, verify)).rejects.toMatchObject({
      reason: 'CUSTOMER_MISMATCH',
    });
    expect(provider.fetchSubscription).toHaveBeenCalledTimes(1);
  });
});
