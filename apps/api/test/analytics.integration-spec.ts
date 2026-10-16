import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { DatabaseModule } from '../src/database/database.module';
import { configuration } from '../src/config/configuration';
import { validateEnvironment } from '../src/config/validate-environment';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BusinessModule } from '../src/modules/business/business.module';
import { WebsiteModule } from '../src/modules/website/website.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { AnalyticsModule } from '../src/modules/analytics/analytics.module';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AnalyticsRepository } from '../src/modules/analytics/analytics.repository';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
type Owner = { id: string; userId: string; siteId: string; cookies: string[] };
describe('Private analytics on isolated PostgreSQL', () => {
  let app: INestApplication,
    prisma: PrismaService,
    config: ConfigService,
    service: AnalyticsService,
    repo: AnalyticsRepository;
  let a: Owner, b: Owner;
  const origin = 'http://localhost:3000';
  const path = (o: Owner) => `/api/v1/businesses/${o.id}/analytics`;
  const event = () => ({
    eventId: randomUUID(),
    eventType: 'PAGE_VIEW',
    consent: true,
  });
  const capture = (o = a, body = event()) =>
    request(app.getHttpServer())
      .post(path(o) + '/events')
      .set('Origin', origin)
      .send(body);
  const report = (o = a, days = 7) =>
    request(app.getHttpServer())
      .get(path(o) + '/report?days=' + days)
      .set('Cookie', o.cookies);
  async function owner(): Promise<Owner> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        firstName: 'Analytics',
        lastName: randomUUID().slice(0, 8),
        email: randomUUID() + '@example.test',
        password: 'SecurityTest123!',
      })
      .expect(201);
    const id = response.body.data.business.id as string;
    const business = await prisma.business.findUniqueOrThrow({ where: { id } });
    const cookies = (response.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
    await prisma.user.update({
      where: { id: business.ownerId },
      data: { emailVerified: true },
    });
    const website = await request(app.getHttpServer())
      .get('/api/v1/websites/' + id)
      .set('Cookie', cookies)
      .expect(200);
    return {
      id,
      cookies,
      userId: business.ownerId,
      siteId: website.body.data.id as string,
    };
  }
  beforeAll(async () => {
    const value = process.env.SECURITY_TEST_DATABASE_URL,
      url = new URL(value || 'https://missing.invalid');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/nexora_security' ||
      !['postgres:', 'postgresql:'].includes(url.protocol)
    )
      throw new Error(
        'Use an isolated loopback PostgreSQL database named nexora_security',
      );
    process.env.DATABASE_URL = value;
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_URL = origin;
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnvironment,
        }),
        DatabaseModule,
        AuthModule,
        BusinessModule,
        WebsiteModule,
        CrmModule,
        AnalyticsModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    service = app.get(AnalyticsService);
    repo = app.get(AnalyticsRepository);
    a = await owner();
    b = await owner();
  });
  beforeEach(async () => {
    config.set('analyticsEnabled', true);
    await prisma.analyticsObservation.deleteMany({
      where: { businessId: { in: [a.id, b.id] } },
    });
    await prisma.analyticsDaily.deleteMany({
      where: { businessId: { in: [a.id, b.id] } },
    });
    await prisma.lead.deleteMany({
      where: { businessId: { in: [a.id, b.id] } },
    });
    await prisma.business.update({
      where: { id: a.id },
      data: { isPublished: true, deletedAt: null },
    });
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: true, deletedAt: null },
    });
    await prisma.subscription.update({
      where: { businessId: a.id },
      data: {
        status: 'TRIAL',
        deletedAt: null,
        trialEndDate: new Date(Date.now() + 3600_000),
      },
    });
    await prisma.website.update({
      where: { businessId: a.id },
      data: { theme: 'DEFAULT', deletedAt: null },
    });
    await request(app.getHttpServer())
      .put(`/api/v1/websites/${a.id}/sections`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({
        sections: [
          { type: 'HERO', content: { headline: 'Real site' } },
          { type: 'CONTACT', content: { title: 'Contact' } },
        ],
      })
      .expect(200);
  });
  afterAll(async () => {
    if (app) {
      if (a) {
        await prisma.analyticsObservation.deleteMany({
          where: { businessId: { in: [a.id, b.id] } },
        });
        await prisma.analyticsObservation.create({
          data: {
            businessId: a.id,
            eventId: randomUUID(),
            eventType: 'PAGE_VIEW',
          },
        });
      }
      await app.close();
    }
  });
  it('keeps the rollout off without persisting anything', async () => {
    config.set('analyticsEnabled', false);
    await capture().expect(503);
    expect(
      await prisma.analyticsObservation.count({ where: { businessId: a.id } }),
    ).toBe(0);
    const response = await report().expect(200);
    expect(response.body.data.collectionEnabled).toBe(false);
  });
  it('stores only minimal event data, ignoring forwarded identity headers', async () => {
    const before = await prisma.business.findUniqueOrThrow({
      where: { id: a.id },
    });
    const response = await capture()
      .set('X-Forwarded-For', '198.51.100.42')
      .set('User-Agent', 'Private test agent')
      .expect(201);
    expect(response.body.data).toEqual({ accepted: true });
    expect(
      (await prisma.business.findUniqueOrThrow({ where: { id: a.id } }))
        .updatedAt,
    ).toEqual(before.updatedAt);
    const row = await prisma.analyticsObservation.findFirstOrThrow({
      where: { businessId: a.id },
    });
    expect(Object.keys(row).sort()).toEqual(
      [
        'id',
        'businessId',
        'eventId',
        'eventType',
        'receivedAt',
        'processedAt',
        'status',
        'attempts',
        'availableAt',
      ].sort(),
    );
    expect(JSON.stringify(row)).not.toContain('198.51.100.42');
    expect(JSON.stringify(row)).not.toContain('Private test agent');
  });
  it.each([false, 'true', null, 1])(
    'requires exact explicit consent %s',
    async (consent) => {
      await request(app.getHttpServer())
        .post(path(a) + '/events')
        .set('Origin', origin)
        .send({ ...event(), consent })
        .expect(400);
    },
  );
  it('rejects metadata, identities, fake dates and unsupported event types', async () => {
    for (const extra of [
      { metadata: { email: 'no@example.test' } },
      { sessionId: 'visitor' },
      { timestamp: '2099-01-01' },
      { eventType: 'LEAD_FORM_SUBMISSION' },
      { eventId: 'bad' },
    ])
      await request(app.getHttpServer())
        .post(path(a) + '/events')
        .set('Origin', origin)
        .send({ ...event(), ...extra })
        .expect(400);
  });
  it('rejects foreign origins before enqueue', async () => {
    await request(app.getHttpServer())
      .post(path(a) + '/events')
      .set('Origin', 'https://evil.test')
      .send(event())
      .expect(403);
  });
  it('denies unpublished, expired, unverified and deleted public businesses', async () => {
    await prisma.business.update({
      where: { id: a.id },
      data: { isPublished: false },
    });
    await capture().expect(404);
    await prisma.business.update({
      where: { id: a.id },
      data: { isPublished: true },
    });
    await prisma.subscription.update({
      where: { businessId: a.id },
      data: { trialEndDate: new Date(0) },
    });
    await capture().expect(404);
    await prisma.subscription.update({
      where: { businessId: a.id },
      data: { trialEndDate: new Date(Date.now() + 3600_000) },
    });
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: false },
    });
    await capture().expect(404);
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: true },
    });
    await prisma.business.update({
      where: { id: a.id },
      data: { deletedAt: new Date() },
    });
    await capture().expect(404);
  });
  it('denies invalid and unverified-media layouts', async () => {
    const hero = await prisma.websiteSection.findFirstOrThrow({
      where: { websiteId: a.siteId, type: 'HERO' },
    });
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: { content: { html: 'unsupported' } },
    });
    await capture().expect(404);
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: {
        content: { imageUrl: 'https://foreign.example.test/photo.webp' },
      },
    });
    await capture().expect(404);
    await prisma.website.update({
      where: { id: a.siteId },
      data: { deletedAt: new Date() },
    });
    await capture().expect(404);
  });
  it('serializes concurrent duplicate requests and does not count twice', async () => {
    const body = event();
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => capture(a, body)),
    );
    expect(responses.every((r) => r.status === 201)).toBe(true);
    expect(
      await prisma.analyticsObservation.count({ where: { businessId: a.id } }),
    ).toBe(1);
    await service.drain();
    await service.drain();
    const data = (await report().expect(200)).body.data;
    expect(data.totals.pageViews).toBe(1);
    expect(data.processing.pending).toBe(0);
  });
  it('keeps event idempotency tenant-scoped', async () => {
    // Owner B uses the actual fresh-signup layout, not the edited owner-A fixture.
    await prisma.business.update({
      where: { id: b.id },
      data: { isPublished: true },
    });
    const body = event();
    await capture(a, body).expect(201);
    await capture(b, body).expect(201);
    expect(
      await prisma.analyticsObservation.count({
        where: { eventId: body.eventId },
      }),
    ).toBe(2);
  });
  it('separates owner reports and keeps retained reports available after expiry', async () => {
    await capture().expect(201);
    await service.drain();
    await request(app.getHttpServer())
      .get(path(a) + '/report')
      .expect(401);
    await request(app.getHttpServer())
      .get(path(a) + '/report')
      .set('Cookie', b.cookies)
      .expect(403);
    expect((await report(b).expect(200)).body.data.totals.pageViews).toBe(0);
    await prisma.subscription.update({
      where: { businessId: a.id },
      data: { trialEndDate: new Date(0) },
    });
    const response = await report().expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data.totals.pageViews).toBe(1);
  });
  it('aggregates both types and fills UTC zero days alongside actual undeleted enquiries', async () => {
    await capture().expect(201);
    await capture(a, { ...event(), eventType: 'WHATSAPP_CLICK' }).expect(201);
    await prisma.lead.createMany({
      data: [
        {
          businessId: a.id,
          name: 'Visitor',
          message: 'Hello',
          source: 'public-website',
        },
        {
          businessId: a.id,
          name: 'Deleted',
          message: 'Removed',
          source: 'public-website',
          deletedAt: new Date(),
        },
        {
          businessId: b.id,
          name: 'Foreign',
          message: 'Private',
          source: 'public-website',
        },
      ],
    });
    const pending = (await report().expect(200)).body.data;
    expect(pending.processing.pending).toBe(2);
    expect(pending.totals.pageViews).toBe(0);
    expect(pending.totals.enquiries).toBe(1);
    await service.drain();
    for (const days of [7, 30, 90]) {
      const data = (await report(a, days).expect(200)).body.data;
      expect(data.series).toHaveLength(days);
      expect(data.series.at(-1).date).toBe(data.through);
      expect(data.totals).toEqual({
        pageViews: 1,
        whatsappClicks: 1,
        enquiries: 1,
      });
    }
    for (const days of [0, 8, 365, 1.5]) await report(a, days).expect(400);
  });
  it('processes concurrent workers without duplicate increments', async () => {
    await prisma.analyticsObservation.createMany({
      data: Array.from({ length: 12 }, () => ({
        businessId: a.id,
        eventId: randomUUID(),
        eventType: 'PAGE_VIEW' as const,
      })),
    });
    await Promise.all([service.drain(12), service.drain(12)]);
    expect((await report().expect(200)).body.data.totals.pageViews).toBe(12);
    expect(
      await prisma.analyticsObservation.count({
        where: { businessId: a.id, status: 'DONE' },
      }),
    ).toBe(12);
  });
  it('rolls back an increment after a worker failure, then recovers exactly once', async () => {
    await capture().expect(201);
    const increment = repo.increment.bind(repo);
    const fault = jest
      .spyOn(repo, 'increment')
      .mockImplementationOnce(async (...args) => {
        await increment(...args);
        throw new Error('simulated crash after increment');
      });
    const failed = await service.drain();
    fault.mockRestore();
    expect(failed.failed).toBe(1);
    expect(
      await prisma.analyticsDaily.count({ where: { businessId: a.id } }),
    ).toBe(0);
    const row = await prisma.analyticsObservation.findFirstOrThrow({
      where: { businessId: a.id },
    });
    expect(row.attempts).toBe(1);
    expect(row.status).toBe('PENDING');
    expect(row.processedAt).toBeNull();
    await prisma.analyticsObservation.update({
      where: { id: row.id },
      data: { availableAt: new Date(0) },
    });
    await service.drain();
    await service.drain();
    expect((await report().expect(200)).body.data.totals.pageViews).toBe(1);
  });
  it('parks poison events after five failed attempts and reports review state', async () => {
    const row = await prisma.analyticsObservation.create({
      data: {
        businessId: a.id,
        eventId: randomUUID(),
        eventType: 'PRODUCT_VIEW',
      },
    });
    for (let i = 0; i < 5; i++) {
      await prisma.analyticsObservation.update({
        where: { id: row.id },
        data: { availableAt: new Date(0) },
      });
      await service.drain(1);
    }
    const data = (await report().expect(200)).body.data;
    expect(data.processing.review).toBe(1);
    expect(data.processing.pending).toBe(0);
    expect(data.totals.pageViews).toBe(0);
  });
  it('bounds processing passes and recovers persisted work through a new worker instance', async () => {
    await prisma.analyticsObservation.createMany({
      data: Array.from({ length: 51 }, () => ({
        businessId: a.id,
        eventId: randomUUID(),
        eventType: 'PAGE_VIEW' as const,
      })),
    });
    const restarted = new AnalyticsService(
      new AnalyticsRepository(prisma),
      config,
    );
    expect((await restarted.drain()).processed).toBe(50);
    expect((await restarted.drain()).processed).toBe(1);
    expect((await report().expect(200)).body.data.totals.pageViews).toBe(51);
  });
  it('enforces shared tenant/hour capacity but still acknowledges a duplicate', async () => {
    const existing = event();
    await capture(a, existing).expect(201);
    await prisma.analyticsObservation.createMany({
      data: Array.from({ length: 999 }, () => ({
        businessId: a.id,
        eventId: randomUUID(),
        eventType: 'PAGE_VIEW' as const,
        status: 'DONE',
        processedAt: new Date(),
      })),
    });
    await capture().expect(429);
    await capture(a, existing).expect(201);
  });
  it('prunes old observations/aggregates in bounded passes without importing legacy identities', async () => {
    const old = new Date(Date.now() - 8 * 86400_000),
      veryOld = new Date(Date.now() - 92 * 86400_000);
    await prisma.analyticsObservation.createMany({
      data: Array.from({ length: 1001 }, () => ({
        businessId: a.id,
        eventId: randomUUID(),
        eventType: 'PAGE_VIEW' as const,
        receivedAt: old,
      })),
    });
    await prisma.analyticsDaily.create({
      data: {
        businessId: a.id,
        eventType: 'PAGE_VIEW',
        day: veryOld,
        count: 5,
      },
    });
    const legacy = await prisma.analyticsEvent.create({
      data: {
        businessId: a.id,
        eventType: 'PAGE_VIEW',
        sessionId: 'legacy-ip-fixture',
        metadata: { source: 'old' },
      },
    });
    const first = await service.drain();
    expect(first.observationsPruned).toBe(1000);
    expect(first.dailyPruned).toBe(1);
    expect(first.processed).toBe(0);
    expect((await service.drain()).observationsPruned).toBe(1);
    expect((await report().expect(200)).body.data.totals.pageViews).toBe(0);
    expect(
      await prisma.analyticsEvent.findUnique({ where: { id: legacy.id } }),
    ).not.toBeNull();
  });
  it('retires the IP/session-based legacy click route without a write', async () => {
    const before = await prisma.analyticsEvent.count({
      where: { businessId: a.id },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.id}/crm/track/whatsapp`)
      .set('Origin', origin)
      .send({ source: 'legacy' })
      .expect(410);
    expect(
      await prisma.analyticsEvent.count({ where: { businessId: a.id } }),
    ).toBe(before);
  });
});
