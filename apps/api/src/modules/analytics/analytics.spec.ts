import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsRequest } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { validateWorkerEnvironment } from './worker-environment';
import { configuration } from '../../config/configuration';
const event = {
  eventId: 'b932437e-4fc8-4d7a-bc42-368c2ebf11de',
  eventType: 'PAGE_VIEW' as const,
  consent: true as const,
};
describe('First-party analytics contract', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  it.each([false, 'true', 'false', 1, null, undefined])(
    'rejects absent or non-exact consent %s',
    async (consent) => {
      await expect(
        pipe.transform(
          { ...event, consent },
          { type: 'body', metatype: AnalyticsRequest },
        ),
      ).rejects.toThrow();
    },
  );
  it.each([
    { metadata: { email: 'not-collected@example.test' } },
    { sessionId: 'visitor' },
    { referrer: 'https://example.test/private' },
    { timestamp: '2099-01-01' },
    { eventType: 'PRODUCT_VIEW' },
    { eventId: 'not-a-uuid' },
  ])('rejects unsupported event input %j', async (extra) => {
    await expect(
      pipe.transform(
        { ...event, ...extra },
        { type: 'body', metatype: AnalyticsRequest },
      ),
    ).rejects.toThrow();
  });
  it('accepts the minimal supported event', async () => {
    await expect(
      pipe.transform(event, { type: 'body', metatype: AnalyticsRequest }),
    ).resolves.toEqual(event);
  });
  it('defaults collection off', () => {
    const previous = process.env.ANALYTICS_ENABLED;
    delete process.env.ANALYTICS_ENABLED;
    expect(configuration().analyticsEnabled).toBe(false);
    if (previous !== undefined) process.env.ANALYTICS_ENABLED = previous;
  });
  it.each(['', 'https://example.test/db', 'postgres:///missing-host'])(
    'fails worker configuration without a PostgreSQL host: %s',
    (DATABASE_URL) => {
      expect(() => validateWorkerEnvironment({ DATABASE_URL })).toThrow(
        'PostgreSQL DATABASE_URL',
      );
    },
  );
  it('does not require auth or provider secrets for the database-only worker', () => {
    expect(
      validateWorkerEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL:
          'postgresql://worker:placeholder@127.0.0.1/nexora_security',
      }),
    ).toHaveProperty('NODE_ENV', 'production');
  });
});
describe('Analytics report and worker policy', () => {
  function setup(enabled = true) {
    const repo = {
      accept: jest.fn(),
      report: jest.fn().mockResolvedValue({
        daily: [],
        leads: [],
        pending: 0,
        review: 0,
        oldest: null,
      }),
      processNext: jest.fn().mockResolvedValue('empty'),
      prune: jest.fn().mockResolvedValue({ observations: 0, daily: 0 }),
      backlog: jest
        .fn()
        .mockResolvedValue({ pending: 0, review: 0, oldestPendingAt: null }),
    };
    return {
      repo,
      service: new AnalyticsService(
        repo as unknown as AnalyticsRepository,
        new ConfigService({ analyticsEnabled: enabled }),
      ),
    };
  }
  it('does not enqueue while rollout is off', async () => {
    const { service, repo } = setup(false);
    await expect(service.capture('business', event)).rejects.toThrow(
      'disabled',
    );
    expect(repo.accept).not.toHaveBeenCalled();
  });
  it.each([0, 8, 365, NaN, 7.5])(
    'rejects unsupported date windows %s',
    async (days) => {
      const { service, repo } = setup();
      await expect(service.report('business', days)).rejects.toThrow();
      expect(repo.report).not.toHaveBeenCalled();
    },
  );
  it('zero-fills exact UTC calendar days without inventing growth or visitor counts', async () => {
    const { service } = setup();
    const report = await service.report('business', 7);
    expect(report.series).toHaveLength(7);
    expect(report.series[0].date).toBe(report.from);
    expect(report.series[6].date).toBe(report.through);
    expect(report.totals).toEqual({
      pageViews: 0,
      whatsappClicks: 0,
      enquiries: 0,
    });
    expect(report).not.toHaveProperty('uniqueVisitors');
    expect(report).not.toHaveProperty('conversionRate');
  });
  it.each([0, 51, -1, 1.2])('bounds worker passes at %s', async (limit) => {
    const { service, repo } = setup();
    await expect(service.drain(limit)).rejects.toThrow();
    expect(repo.processNext).not.toHaveBeenCalled();
  });
  it('stops when empty and still performs retention while collection is disabled', async () => {
    const { service, repo } = setup(false);
    const result = await service.drain();
    expect(repo.processNext).toHaveBeenCalledTimes(1);
    expect(repo.prune).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(0);
  });
});
