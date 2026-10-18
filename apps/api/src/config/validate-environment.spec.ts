import { validateEnvironment } from './validate-environment';
const production = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'x'.repeat(48),
  JWT_REFRESH_SECRET: 'y'.repeat(48),
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  FRONTEND_URL: 'https://example.com',
};
describe('production configuration', () => {
  const brevo = {
    ...production,
    EMAIL_PROVIDER: 'brevo',
    BREVO_API_KEY: 'private-test-key',
    EMAIL_FROM: 'accounts@example.test',
    EMAIL_TOKEN_KEY: 'ab'.repeat(32),
  };
  it('accepts complete Brevo configuration without SMTP', () => {
    expect(validateEnvironment(brevo)).toBe(brevo);
  });
  it.each(['BREVO_API_KEY', 'EMAIL_FROM', 'EMAIL_TOKEN_KEY'])(
    'rejects incomplete Brevo configuration: %s',
    (key) => {
      expect(() => validateEnvironment({ ...brevo, [key]: '' })).toThrow(
        'Configured Brevo',
      );
    },
  );
  it('rejects malformed Brevo sender and unsupported provider', () => {
    expect(() =>
      validateEnvironment({
        ...brevo,
        EMAIL_FROM: 'Nexora <accounts@example.test>',
      }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...production, EMAIL_PROVIDER: 'other' }),
    ).toThrow();
  });
  it('rejects configured SMTP without a secure mail key and sender', () => {
    expect(() =>
      validateEnvironment({ ...production, SMTP_HOST: 'smtp.example.test' }),
    ).toThrow('Configured SMTP');
  });
  it('accepts configured SMTP with an explicit encryption key and sender', () => {
    const value = {
      ...production,
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'test',
      SMTP_PASS: 'test',
      EMAIL_FROM: 'owner@example.test',
      EMAIL_TOKEN_KEY: 'ab'.repeat(32),
    };
    expect(validateEnvironment(value)).toBe(value);
  });
  it('accepts explicit valid settings', () =>
    expect(validateEnvironment(production)).toBe(production));
  it('permits isolated development settings', () =>
    expect(validateEnvironment({ NODE_ENV: 'test' })).toEqual({
      NODE_ENV: 'test',
    }));
  it.each([
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'FRONTEND_URL',
  ])('rejects absent %s', (key) =>
    expect(() =>
      validateEnvironment({ ...production, [key]: undefined }),
    ).toThrow(),
  );
  it('rejects identical secrets', () =>
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_REFRESH_SECRET: production.JWT_ACCESS_SECRET,
      }),
    ).toThrow());
  it('rejects placeholders even if long', () =>
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: 'REPLACE_WITH_PRIVATE_RANDOM_ACCESS_SECRET',
      }),
    ).toThrow());
  it('rejects non-HTTPS frontend origin', () =>
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: 'http://example.com',
      }),
    ).toThrow());
  it('rejects an origin with a path', () =>
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: 'https://example.com/dashboard',
      }),
    ).toThrow());
  it('keeps live checkout off unless all explicit launch controls match', () => {
    expect(() =>
      validateEnvironment({ ...production, PAYSTACK_LIVE_ENABLED: 'true' }),
    ).toThrow('Live checkout requires a Paystack live secret key');
    expect(() =>
      validateEnvironment({
        ...production,
        PAYSTACK_LIVE_ENABLED: 'true',
        PAYSTACK_SECRET_KEY: 'sk_live_example',
      }),
    ).toThrow('approved Nexora production origin');
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: 'https://nexora.froshcodeorbit.site',
        PAYSTACK_LIVE_ENABLED: 'true',
        PAYSTACK_SECRET_KEY: 'sk_live_example',
      }),
    ).not.toThrow();
  });
  it('rejects publishing without verified-format storage settings', () => {
    expect(() =>
      validateEnvironment({ ...production, PUBLIC_PUBLISHING_ENABLED: 'true' }),
    ).toThrow('configured Cloudinary');
    expect(() =>
      validateEnvironment({
        ...production,
        PUBLIC_PUBLISHING_ENABLED: 'true',
        CLOUDINARY_CLOUD_NAME: 'nexora-media',
        CLOUDINARY_API_KEY: '123456789',
        CLOUDINARY_API_SECRET: 'example-private-value',
      }),
    ).not.toThrow();
  });
  it('rejects NODE_ENV typos', () =>
    expect(() =>
      validateEnvironment({ ...production, NODE_ENV: 'prod' }),
    ).toThrow());
});
