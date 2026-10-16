export function validateWorkerEnvironment(env: Record<string, unknown>) {
  try {
    if (typeof env.DATABASE_URL !== 'string') throw new Error();
    const u = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.hostname)
      throw new Error();
  } catch {
    throw new Error('Analytics worker requires a PostgreSQL DATABASE_URL');
  }
  return env;
}
