import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnvironment } from '../src/config/validate-environment';
import { configuration } from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BusinessModule } from '../src/modules/business/business.module';
import { WebsiteModule } from '../src/modules/website/website.module';
import { StorefrontModule } from '../src/modules/storefront/storefront.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

type Owner = {
  businessId: string;
  userId: string;
  slug: string;
  cookies: string[];
};
describe('Public website lifecycle on isolated PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: ConfigService;
  let a: Owner;
  let b: Owner;
  const origin = 'http://localhost:3000';
  const sections = [
    {
      type: 'HERO',
      content: { headline: 'Real business story', buttonLink: '#contact' },
    },
    { type: 'CONTACT', content: { title: 'Get in touch', email: true } },
  ];
  const publication = (o: Owner) =>
    `/api/v1/businesses/${o.businessId}/storefront/publication`;
  const publicUrl = (o: Owner) => '/api/v1/storefronts/' + o.slug;
  function publish(o: Owner, published = true) {
    return request(app.getHttpServer())
      .put(publication(o))
      .set('Cookie', o.cookies)
      .set('Origin', origin)
      .send({ published });
  }
  async function owner(): Promise<Owner> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        firstName: 'Storefront',
        lastName: randomUUID().slice(0, 8),
        email: randomUUID() + '@example.test',
        password: 'SecurityTest123!',
      })
      .expect(201);
    const businessId = response.body.data.business.id as string;
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    await prisma.user.update({
      where: { id: business.ownerId },
      data: { emailVerified: true },
    });
    const o = {
      businessId,
      userId: business.ownerId,
      slug: business.slug,
      cookies: (response.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0],
      ),
    };
    await request(app.getHttpServer())
      .get('/api/v1/websites/' + businessId)
      .set('Cookie', o.cookies)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/websites/${businessId}/sections`)
      .set('Cookie', o.cookies)
      .set('Origin', origin)
      .send({ sections })
      .expect(200);
    return o;
  }
  beforeAll(async () => {
    const value = process.env.SECURITY_TEST_DATABASE_URL;
    const url = new URL(value || 'https://missing.invalid');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/nexora_security' ||
      !['postgres:', 'postgresql:'].includes(url.protocol)
    )
      throw new Error(
        'Set SECURITY_TEST_DATABASE_URL to an isolated loopback PostgreSQL database named nexora_security',
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
        StorefrontModule,
        CrmModule,
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
    a = await owner();
    b = await owner();
  });
  beforeEach(async () => {
    config.set('publishingEnabled', true);
    await prisma.business.update({
      where: { id: a.businessId },
      data: { isPublished: false, deletedAt: null, logoUrl: null },
    });
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: true },
    });
    await prisma.subscription.update({
      where: { businessId: a.businessId },
      data: {
        status: 'TRIAL',
        deletedAt: null,
        trialEndDate: new Date(Date.now() + 3600_000),
      },
    });
    await prisma.website.update({
      where: { businessId: a.businessId },
      data: { theme: 'DEFAULT', deletedAt: null },
    });
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('previews unpublished content privately but denies public visitors', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/businesses/${a.businessId}/storefront/preview`)
      .set('Cookie', a.cookies)
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data.sections[0].content.headline).toBe(
      'Real business story',
    );
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
  });
  it('requires authentication and tenant ownership for preview, state and publication', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/businesses/${a.businessId}/storefront/preview`)
      .expect(401);
    for (const suffix of ['preview', 'publication'])
      await request(app.getHttpServer())
        .get(`/api/v1/businesses/${b.businessId}/storefront/${suffix}`)
        .set('Cookie', a.cookies)
        .expect(403);
    await request(app.getHttpServer())
      .put(publication(b))
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ published: true })
      .expect(403);
  });
  it('keeps publishing disabled by default and exposes the reason to the owner', async () => {
    config.set('publishingEnabled', false);
    await publish(a).expect(503);
    const state = await request(app.getHttpServer())
      .get(publication(a))
      .set('Cookie', a.cookies)
      .expect(200);
    expect(state.body.data.publishingEnabled).toBe(false);
    expect(state.body.data.reasons.join(' ')).toContain('launch approval');
  });
  it('blocks the old general-profile publication bypass', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/businesses/' + a.businessId)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ isPublished: true })
      .expect(403);
    expect(
      (await prisma.business.findUniqueOrThrow({ where: { id: a.businessId } }))
        .isPublished,
    ).toBe(false);
  });
  it.each(['true', 'false', 1, null])(
    'rejects non-boolean publication value %s',
    async (published) => {
      await request(app.getHttpServer())
        .put(publication(a))
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ published })
        .expect(400);
    },
  );
  it('requires a verified owner even for previously published legacy data', async () => {
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: false },
    });
    await publish(a).expect(400);
    await prisma.business.update({
      where: { id: a.businessId },
      data: { isPublished: true },
    });
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Origin', origin)
      .send({ name: 'Visitor', message: 'Hi', source: 'public-website' })
      .expect(404);
  });
  it('conceals sites belonging to a soft-deleted owner', async () => {
    await publish(a).expect(200);
    await prisma.user.update({
      where: { id: a.userId },
      data: { deletedAt: new Date() },
    });
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    await prisma.user.update({
      where: { id: a.userId },
      data: { deletedAt: null },
    });
  });
  it.each(['EXPIRED', 'SUSPENDED', 'PAST_DUE'] as const)(
    'denies publication and reads for %s',
    async (status) => {
      await prisma.subscription.update({
        where: { businessId: a.businessId },
        data: { status },
      });
      await publish(a).expect(400);
      await prisma.business.update({
        where: { id: a.businessId },
        data: { isPublished: true },
      });
      await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    },
  );
  it('rechecks expiry immediately and still allows unpublishing with rollout disabled', async () => {
    await publish(a).expect(200);
    await request(app.getHttpServer()).get(publicUrl(a)).expect(200);
    await prisma.subscription.update({
      where: { businessId: a.businessId },
      data: { trialEndDate: new Date(0) },
    });
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    config.set('publishingEnabled', false);
    await publish(a, false).expect(200);
  });
  it('projects only public fields and records an audit event', async () => {
    await publish(a).expect(200);
    const response = await request(app.getHttpServer())
      .get(publicUrl(a))
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Object.keys(response.body.data).sort()).toEqual(
      [
        'analyticsEnabled',
        'business',
        'page',
        'pageSize',
        'primary',
        'products',
        'productsTotal',
        'sections',
        'services',
        'servicesTotal',
        'theme',
      ].sort(),
    );
    expect(response.body.data.business).not.toHaveProperty('ownerId');
    expect(response.body.data).not.toHaveProperty('subscription');
    expect(
      await prisma.auditLog.count({
        where: {
          userId: a.userId,
          action: 'WEBSITE_PUBLISHED',
          entityId: a.businessId,
        },
      }),
    ).toBeGreaterThan(0);
  });
  it('completes visitor enquiry to owner inbox without disclosing private lead data', async () => {
    await publish(a).expect(200);
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Origin', origin)
      .send({
        name: 'Real visitor',
        email: 'visitor@example.test',
        message: 'Please share availability',
        website: '',
        source: 'public-website',
      })
      .expect(201);
    expect(Object.keys(sent.body.data)).toEqual(['id']);
    const inbox = await request(app.getHttpServer())
      .get(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Cookie', a.cookies)
      .expect(200);
    expect(
      inbox.body.data.data.some(
        (lead: { id: string }) => lead.id === sent.body.data.id,
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .get(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Cookie', b.cookies)
      .expect(403);
    await publish(a, false).expect(200);
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Origin', origin)
      .send({ name: 'Blocked', message: 'Hi', source: 'public-website' })
      .expect(404);
  });
  it('rejects honeypot submissions and foreign origins', async () => {
    await publish(a).expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Origin', origin)
      .send({
        name: 'Bot',
        message: 'Spam',
        source: 'public-website',
        website: 'spam',
      })
      .expect(400);
    await request(app.getHttpServer())
      .put(publication(a))
      .set('Cookie', a.cookies)
      .set('Origin', 'https://evil.test')
      .send({ published: true })
      .expect(403);
  });
  it('caps tenant enquiries at 100 per hour', async () => {
    await publish(a).expect(200);
    await prisma.lead.createMany({
      data: Array.from({ length: 100 }, () => ({
        businessId: a.businessId,
        name: 'Capacity fixture',
        message: 'Fixture',
        source: 'capacity-test',
      })),
    });
    await request(app.getHttpServer())
      .post(`/api/v1/businesses/${a.businessId}/crm/leads`)
      .set('Origin', origin)
      .send({ name: 'Visitor', message: 'Hi', source: 'public-website' })
      .expect(429);
  });
  it('paginates a stable catalogue and rejects invalid page bounds', async () => {
    await prisma.product.createMany({
      data: Array.from({ length: 51 }, (_, i) => ({
        businessId: a.businessId,
        name: 'Product ' + i,
        slug: 'product-' + i,
        price: '1200.50',
      })),
    });
    await publish(a).expect(200);
    const first = await request(app.getHttpServer())
      .get(publicUrl(a))
      .expect(200);
    const second = await request(app.getHttpServer())
      .get(publicUrl(a) + '?page=2')
      .expect(200);
    expect(first.body.data.products).toHaveLength(50);
    expect(second.body.data.products).toHaveLength(1);
    expect(first.body.data.products[0].price).toBe('1200.5');
    expect(
      first.body.data.products.some(
        (p: { id: string }) => p.id === second.body.data.products[0].id,
      ),
    ).toBe(false);
    for (const page of ['0', '-1', '1.5', 'NaN', '10001'])
      await request(app.getHttpServer())
        .get(publicUrl(a) + '?page=' + page)
        .expect(400);
  });
  it('strips legacy unverified branding and product image URLs', async () => {
    await prisma.business.update({
      where: { id: a.businessId },
      data: { logoUrl: 'https://unverified.example.test/logo.png' },
    });
    await prisma.product.create({
      data: {
        businessId: a.businessId,
        name: 'Featured unsafe image',
        slug: 'unsafe-image',
        isFeatured: true,
        price: 10,
        images: {
          create: {
            url: 'https://unverified.example.test/product.png',
            order: 0,
          },
        },
      },
    });
    await publish(a).expect(200);
    const result = await request(app.getHttpServer())
      .get(publicUrl(a))
      .expect(200);
    expect(result.body.data.business.logoUrl).toBeNull();
    expect(result.body.data.products[0].images).toEqual([]);
  });
  it('conceals unsupported legacy sections and excludes them from the sitemap', async () => {
    const site = await prisma.website.findUniqueOrThrow({
      where: { businessId: a.businessId },
    });
    const hero = await prisma.websiteSection.findFirstOrThrow({
      where: { websiteId: site.id, type: 'HERO' },
    });
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: {
        content: { headline: 'Valid', secretUnsupported: 'not released' },
      },
    });
    await publish(a).expect(400);
    await prisma.business.update({
      where: { id: a.businessId },
      data: { isPublished: true },
    });
    await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    const sitemap = await request(app.getHttpServer())
      .get('/api/v1/storefronts/sitemap')
      .expect(200);
    expect(sitemap.body.data).not.toContain(a.slug);
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: { content: sections[0].content },
    });
  });
  it('refuses unregistered section images even in an owner preview', async () => {
    const site = await prisma.website.findUniqueOrThrow({
      where: { businessId: a.businessId },
    });
    const hero = await prisma.websiteSection.findFirstOrThrow({
      where: { websiteId: site.id, type: 'HERO' },
    });
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: { content: { imageUrl: 'https://foreign.example.test/image.png' } },
    });
    await publish(a).expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/businesses/${a.businessId}/storefront/preview`)
      .set('Cookie', a.cookies)
      .expect(400);
    await prisma.websiteSection.update({
      where: { id: hero.id },
      data: { content: sections[0].content },
    });
  });
  it('lists only eligible sites and removes unpublished sites immediately', async () => {
    await publish(a).expect(200);
    let response = await request(app.getHttpServer())
      .get('/api/v1/storefronts/sitemap')
      .expect(200);
    expect(response.body.data).toContain(a.slug);
    expect(response.body.data).not.toContain(b.slug);
    await publish(a, false).expect(200);
    response = await request(app.getHttpServer())
      .get('/api/v1/storefronts/sitemap')
      .expect(200);
    expect(response.body.data).not.toContain(a.slug);
  });
  it.each(['business', 'website', 'subscription'] as const)(
    'denies soft-deleted %s data',
    async (entity) => {
      await publish(a).expect(200);
      if (entity === 'business')
        await prisma.business.update({
          where: { id: a.businessId },
          data: { deletedAt: new Date() },
        });
      if (entity === 'website')
        await prisma.website.update({
          where: { businessId: a.businessId },
          data: { deletedAt: new Date() },
        });
      if (entity === 'subscription')
        await prisma.subscription.update({
          where: { businessId: a.businessId },
          data: { deletedAt: new Date() },
        });
      await request(app.getHttpServer()).get(publicUrl(a)).expect(404);
    },
  );
});
