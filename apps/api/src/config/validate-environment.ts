export function validateEnvironment(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const text = (value: unknown): string =>
    typeof value === 'string' ? value : '';
  const mode = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(text(mode))) {
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
  const mailProvider = env.EMAIL_PROVIDER || 'smtp';
  if (!['smtp', 'brevo'].includes(text(mailProvider)))
    throw new Error('EMAIL_PROVIDER must be smtp or brevo');
  if (
    mailProvider === 'brevo' &&
    (typeof env.BREVO_API_KEY !== 'string' ||
      !env.BREVO_API_KEY.trim() ||
      !/^[a-fA-F0-9]{64}$/.test(text(env.EMAIL_TOKEN_KEY)) ||
      !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(text(env.EMAIL_FROM)))
  )
    throw new Error(
      'Configured Brevo requires BREVO_API_KEY, a plain EMAIL_FROM address and an independent 64-hex EMAIL_TOKEN_KEY',
    );
  if (
    mailProvider === 'smtp' &&
    env.SMTP_HOST &&
    (!/^[a-fA-F0-9]{64}$/.test(text(env.EMAIL_TOKEN_KEY)) ||
      !env.SMTP_USER ||
      !env.SMTP_PASS ||
      !env.EMAIL_FROM)
  ) {
    throw new Error(
      'Configured SMTP requires credentials, EMAIL_FROM and an independent 64-hex EMAIL_TOKEN_KEY',
    );
  }
  if (env.PAYSTACK_LIVE_ENABLED === 'true') {
    if (!text(env.PAYSTACK_SECRET_KEY).startsWith('sk_live_'))
      throw new Error('Live checkout requires a Paystack live secret key');
    if (text(env.FRONTEND_URL) !== 'https://nexora.froshcodeorbit.site')
      throw new Error('Live checkout requires the approved Nexora production origin');
  }
  if (env.PUBLIC_PUBLISHING_ENABLED === 'true') {
    const endpoint = text(env.AWS_ENDPOINT_URL_S3);
    if (
      !/^https:\/\/[a-z0-9-]+\.storage\.c-[0-9]+\.[a-z0-9-]+\.aws\.neon\.tech\/?$/.test(endpoint) ||
      text(env.NEON_STORAGE_BUCKET) !== 'nexora-public' ||
      !text(env.AWS_REGION) ||
      !text(env.AWS_ACCESS_KEY_ID) ||
      !text(env.AWS_SECRET_ACCESS_KEY)
    ) throw new Error('Public publishing requires Neon Object Storage configuration');
  }
  try {
    const database = new URL(text(env.DATABASE_URL));
    if (
      !['postgresql:', 'postgres:'].includes(database.protocol) ||
      !database.hostname
    )
      throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL in production');
  }
  try {
    const database = new URL(text(env.DATABASE_URL));
    const direct = new URL(text(env.DIRECT_URL));
    if (!['postgres:', 'postgresql:'].includes(direct.protocol) ||
        !direct.hostname || direct.hostname.includes('-pooler.') ||
        database.pathname !== direct.pathname ||
        database.username !== direct.username ||
        database.hostname.replace('-pooler.', '.') !== direct.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error('DIRECT_URL must target the matching non-pooled PostgreSQL database');
  }
  try {
    const frontend = new URL(text(env.FRONTEND_URL));
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
