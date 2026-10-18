import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PaystackService } from './paystack.service';

describe('Paystack transport security', () => {
  const secret = 'sk_test_fake_for_unit_tests';
  const provider = new PaystackService(
    new ConfigService({ paystack: { secretKey: secret } }),
  );
  const raw = Buffer.from('{ "event": "charge.success", "data": {} }');
  const signature = createHmac('sha512', secret).update(raw).digest('hex');
  afterEach(() => jest.restoreAllMocks());
  it('authenticates the exact bytes, including whitespace', () => {
    expect(provider.validateWebhookSignature(signature, raw)).toBe(true);
    expect(
      provider.validateWebhookSignature(
        signature,
        Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),
      ),
    ).toBe(false);
  });
  it.each(['', 'garbage', 'a'.repeat(127), 'g'.repeat(128)])(
    'rejects malformed signatures safely',
    (value) => {
      expect(provider.validateWebhookSignature(value, raw)).toBe(false);
    },
  );
  it('fails closed with a missing secret or missing raw body', () => {
    expect(
      new PaystackService(new ConfigService()).validateWebhookSignature(
        signature,
        raw,
      ),
    ).toBe(false);
    expect(provider.validateWebhookSignature(signature, undefined)).toBe(false);
  });
  it('blocks live initialization before any network call', () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    expect(() =>
      new PaystackService(
        new ConfigService({ paystack: { secretKey: 'sk_live_fake' } }),
      ).assertCheckoutEnabled(),
    ).toThrow('Live checkout is disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('permits a live key only after an explicit production switch', () => {
    const live = new PaystackService(
      new ConfigService({
        nodeEnv: 'production',
        paystack: { secretKey: 'sk_live_fake', liveEnabled: true },
      }),
    );
    expect(live.expectedDomain()).toBe('live');
    expect(() => live.assertCheckoutEnabled()).not.toThrow();
    expect(() =>
      new PaystackService(
        new ConfigService({
          nodeEnv: 'test',
          paystack: { secretKey: 'sk_live_fake', liveEnabled: true },
        }),
      ).assertCheckoutEnabled(),
    ).toThrow('Live checkout is disabled');
  });
  it('preserves cancellation transport even if new live checkout is paused', async () => {
    const live = new PaystackService(
      new ConfigService({ nodeEnv: 'production', paystack: { secretKey: 'sk_live_fake' } }),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: null }), { status: 200 }),
    );
    await expect(live.cancelSubscription('SUB_123', 'token')).resolves.toBeUndefined();
  });
  it('bounds provider requests and hides provider errors', async () => {
    const mock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('sensitive provider detail'));
    await expect(provider.verifyTransaction('a/b')).rejects.toThrow(
      'Payment provider unavailable',
    );
    expect(mock).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/verify/a%2Fb',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it('rejects a substituted checkout reference or URL', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          reference: 'other',
          authorization_url: 'https://attacker.test',
        },
      }),
    } as Response);
    await expect(
      provider.initializeTransaction(
        'owner@example.test',
        5000000,
        'PLN_test',
        'http://localhost:3000',
        'expected',
        { businessId: 'b', planName: 'BASIC' },
      ),
    ).rejects.toThrow('Invalid checkout');
  });
});
