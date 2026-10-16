import { ConfigService } from '@nestjs/config';
import {
  AccountMailService,
  SmtpAccountTransport,
} from './account-mail.service';
import { AccountSecurityRepository } from './account-security.repository';
import { secretToken, tokenHash, validToken } from './account-security';

describe('Account secrets and mail envelopes', () => {
  const key = 'ab'.repeat(32);
  function setup() {
    const repo = { issueAction: jest.fn().mockResolvedValue(true) };
    const mail = new AccountMailService(
      repo as unknown as AccountSecurityRepository,
      new ConfigService({
        email: {
          host: 'smtp.example.test',
          user: 'test',
          pass: 'test',
          from: 'owner@example.test',
          tokenKey: key,
        },
      }),
      {} as SmtpAccountTransport,
    );
    return { mail, repo };
  }
  it('generates distinct 256-bit purpose-bound tokens and one-way digests', () => {
    const first = secretToken('reset'),
      second = secretToken('reset');
    expect(first).not.toBe(second);
    expect(validToken(first, 'reset')).toBe(true);
    expect(validToken(first, 'verify')).toBe(false);
    expect(validToken('legacy-uuid', 'rt')).toBe(false);
    expect(tokenHash(first)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(tokenHash(first)).not.toContain(first);
  });
  it('queues ciphertext, not a raw bearer token', async () => {
    const { mail, repo } = setup();
    expect(await mail.enqueue('owner', 'RESET')).toEqual({
      delivery: 'QUEUED',
    });
    const args = repo.issueAction.mock.calls[0] as unknown[];
    expect(args[0]).toBe('owner');
    expect(args[1]).toBe('RESET');
    expect(String(args[2])).toMatch(/^sha256:/);
    expect(String(args[3])).not.toMatch(/reset_/);
  });
  it('randomizes ciphertext and authenticates envelope identity', () => {
    const { mail } = setup();
    expect(mail.seal('secret', 'owner:RESET')).not.toBe(
      mail.seal('secret', 'owner:RESET'),
    );
  });
  it('does not pretend to queue when mail configuration is missing', async () => {
    const mail = new AccountMailService(
      {} as AccountSecurityRepository,
      new ConfigService(),
      {} as SmtpAccountTransport,
    );
    expect(await mail.enqueue('owner', 'VERIFY')).toEqual({
      delivery: 'UNAVAILABLE',
    });
  });
});
