import { validateBillingWorkerEnvironment } from './billing.worker-environment';

describe('Billing one-shot worker environment', () => {
  const valid = {
    BILLING_WORKER_MODE: 'scheduled',
    PAYSTACK_SECRET_KEY: 'sk_test_dummy',
    DATABASE_URL: 'postgresql://user:password@ep-neon-pooler.example/nexora',
    DIRECT_URL: 'postgresql://user:password@ep-neon.example/nexora',
  };
  it('accepts a separate Neon direct and runtime connection', () => {
    expect(validateBillingWorkerEnvironment(valid)).toBe(valid);
  });
  it('requires deliberate scheduled mode', () => {
    expect(() => validateBillingWorkerEnvironment({ ...valid, BILLING_WORKER_MODE: undefined }))
      .toThrow('explicitly scheduled');
  });
  it('rejects missing Paystack credentials and invalid database endpoints', () => {
    expect(() => validateBillingWorkerEnvironment({ ...valid, PAYSTACK_SECRET_KEY: '' }))
      .toThrow('Paystack');
    expect(() => validateBillingWorkerEnvironment({ ...valid, DIRECT_URL: valid.DATABASE_URL }))
      .toThrow('valid DIRECT_URL');
  });
});
