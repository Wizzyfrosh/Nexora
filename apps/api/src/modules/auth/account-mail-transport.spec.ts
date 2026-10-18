import { ConfigService } from '@nestjs/config';
import {
  AccountMailService,
  AccountMailTransport,
} from './account-mail.service';
import { AccountSecurityRepository } from './account-security.repository';

describe('Brevo account email transport', () => {
  const originalFetch = global.fetch;
  const config = new ConfigService({
    email: {
      provider: 'brevo',
      brevoApiKey: 'test-private-key',
      from: 'accounts@example.test',
      tokenKey: 'ab'.repeat(32),
    },
  });
  const fetchMock = jest.fn();
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('sends a bounded HTTPS request without requiring SMTP credentials', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ messageId: '<receipt>' }), { status: 201 }),
    );
    await new AccountMailTransport(config).send(
      'owner@example.test',
      'Verify',
      'Single-use link',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        signal: expect.any(AbortSignal) as unknown,
        headers: expect.objectContaining({
          'api-key': 'test-private-key',
        }) as unknown,
        body: JSON.stringify({
          sender: { email: 'accounts@example.test', name: 'Nexora' },
          to: [{ email: 'owner@example.test' }],
          subject: 'Verify',
          textContent: 'Single-use link',
        }),
      }),
    );
  });

  it.each([401, 429, 500, 302, 200])(
    'rejects provider status %s without exposing its response',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('sensitive provider details', { status }),
      );
      await expect(
        new AccountMailTransport(config).send(
          'owner@example.test',
          'Verify',
          'token',
        ),
      ).rejects.toThrow('Email transport unavailable');
    },
  );

  it.each(['{}', '{"messageId":""}', 'not-json'])(
    'requires a valid provider receipt: %s',
    async (body) => {
      fetchMock.mockResolvedValue(new Response(body, { status: 201 }));
      await expect(
        new AccountMailTransport(config).send(
          'owner@example.test',
          'Verify',
          'token',
        ),
      ).rejects.toThrow('Email transport unavailable');
    },
  );

  it('redacts network and timeout errors', async () => {
    fetchMock.mockRejectedValue(new Error('secret request payload'));
    await expect(
      new AccountMailTransport(config).send(
        'owner@example.test',
        'Verify',
        'token',
      ),
    ).rejects.toThrow('Email transport unavailable');
  });

  it('does not call the provider without a key', async () => {
    const transport = new AccountMailTransport(
      new ConfigService({ email: { provider: 'brevo' } }),
    );
    await expect(
      transport.send('owner@example.test', 'Verify', 'token'),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queues encrypted mail with Brevo configuration and no SMTP settings', async () => {
    const repo = { issueAction: jest.fn().mockResolvedValue(true) };
    const mail = new AccountMailService(
      repo as unknown as AccountSecurityRepository,
      config,
      new AccountMailTransport(config),
    );
    expect(await mail.enqueue('owner', 'VERIFY')).toEqual({
      delivery: 'QUEUED',
    });
    const args = repo.issueAction.mock.calls[0] as unknown[];
    expect(args[3]).not.toContain('verify_');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves unconfigured providers unavailable', () => {
    const cfg = new ConfigService({
      email: { provider: 'unknown', tokenKey: 'ab'.repeat(32) },
    });
    expect(
      new AccountMailService(
        {} as AccountSecurityRepository,
        cfg,
        new AccountMailTransport(cfg),
      ).configured(),
    ).toBe(false);
  });
});
