export function validateEnvironment(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const mode = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(mode))) {
    throw new Error('NODE_ENV must be development, test or production');
  }
  if (mode !== 'production') return env;
  const weak = /change.?me|replace|placeholder|nexora-(access|refresh)-secret/i;
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = env[name];
    if (
      typeof value !== 'string' ||
      value.trim().length < 32 ||
      weak.test(value)
    ) {
      throw new Error(
        name +
          ' must be a private random secret of at least 32 characters in production',
      );
    }
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('Production JWT access and refresh secrets must differ');
  }
  try {
    const database = new URL(String(env.DATABASE_URL ?? ''));
    if (
      !['postgresql:', 'postgres:'].includes(database.protocol) ||
      !database.hostname
    )
      throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL in production');
  }
  try {
    const frontend = new URL(String(env.FRONTEND_URL ?? ''));
    if (
      frontend.protocol !== 'https:' ||
      frontend.origin !== env.FRONTEND_URL ||
      frontend.username ||
      frontend.password
    )
      throw new Error();
  } catch {
    throw new Error('FRONTEND_URL must be an exact HTTPS origin in production');
  }
  return env;
}
