/**
 * One-shot scheduled reconciliation worker.
 * Refuse accidental invocation from a web service or without a provider key.
 */
export function validateBillingWorkerEnvironment(env: Record<string, unknown>) {
  if (env.BILLING_WORKER_MODE !== 'scheduled') {
    throw new Error('Billing worker must be explicitly scheduled');
  }
  if (!['sk_test_', 'sk_live_'].some((prefix) =>
    typeof env.PAYSTACK_SECRET_KEY === 'string' && env.PAYSTACK_SECRET_KEY.startsWith(prefix),
  )) {
    throw new Error('Billing worker requires configured Paystack credentials');
  }
  for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
    const value = env[name];
    if (typeof value !== 'string') throw new Error('Billing worker requires ' + name);
    try {
      const parsed = new URL(value);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
          !parsed.hostname || !parsed.pathname || parsed.pathname === '/') throw new Error();
      if (name === 'DIRECT_URL' && parsed.hostname.includes('-pooler.')) throw new Error();
    } catch {
      throw new Error('Billing worker requires a valid ' + name);
    }
  }
  return env;
}
