import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { WebsiteRepository } from '../src/modules/website/website.repository';
import { validateEnvironment } from '../src/config/validate-environment';
import { configuration } from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BusinessModule } from '../src/modules/business/business.module';
import { ProductModule } from '../src/modules/product/product.module';
import { ServiceModule } from '../src/modules/service/service.module';
import { WebsiteModule } from '../src/modules/website/website.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

type Owner = { businessId: string; slug: string; cookies: string[] };
describe('Tenant security on isolated PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let a: Owner;
  let b: Owner;
  const origin = 'http://localhost:3000';
  async function owner(firstName: string): Promise<Owner> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        firstName,
        lastName: 'Security' + randomUUID().slice(0, 8),
        email: randomUUID() + '@example.test',
        password: 'SecurityTest123!',
      })
      .expect(201);
    await prisma.user.updateMany({ where: { businesses: { some: { id: response.body.data.business.id } } }, data: { emailVerified: true } });
    return {
      businessId: response.body.data.business.id,
      slug: response.body.data.business.slug,
      cookies: (response.headers['set-cookie'] as unknown as string[]).map(
        (cookie) => cookie.split(';')[0],
      ),
    };
  }
  beforeAll(async () => {
    const value = process.env.SECURITY_TEST_DATABASE_URL;
    const url = new URL(value || 'https://missing.invalid');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/nexora_security' ||
      !['postgres:', 'postgresql:'].includes(url.protocol)
    ) {
      throw new Error(
        'Set SECURITY_TEST_DATABASE_URL to an isolated loopback PostgreSQL database named nexora_security',
      );
    }
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
        ProductModule,
        ServiceModule,
        WebsiteModule,
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
    a = await owner('Alice');
    b = await owner('Bob');
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('cannot read or mutate another business profile with an authentic cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/businesses/' + b.businessId)
      .set('Cookie', a.cookies)
      .expect(403);
    await request(app.getHttpServer())
      .put('/api/v1/businesses/' + b.businessId)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ name: 'Stolen' })
      .expect(403);
    expect(
      (await prisma.business.findUniqueOrThrow({ where: { id: b.businessId } }))
        .name,
    ).not.toBe('Stolen');
  });
  it('rejects foreign section IDs without deleting or changing either website', async () => {
    const wa = await prisma.website.findUniqueOrThrow({
      where: { businessId: a.businessId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    const wb = await prisma.website.findUniqueOrThrow({
      where: { businessId: b.businessId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    await request(app.getHttpServer())
      .put('/api/v1/websites/' + a.businessId + '/sections')
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({
        sections: [
          {
            id: wb.sections[0].id,
            type: 'HERO',
            content: { headline: 'Attack' },
          },
        ],
      })
      .expect(400);
    expect(
      await prisma.websiteSection.findMany({
        where: { websiteId: wa.id },
        orderBy: { order: 'asc' },
      }),
    ).toEqual(wa.sections);
    expect(
      await prisma.websiteSection.findMany({
        where: { websiteId: wb.id },
        orderBy: { order: 'asc' },
      }),
    ).toEqual(wb.sections);
  });
  it('rolls back a late transaction error including deletions and prior updates', async () => {
    const site = await prisma.website.findUniqueOrThrow({
      where: { businessId: a.businessId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    const repository = app.get(WebsiteRepository);
    // An invalid required field bypasses HTTP validation to fail after deletion/update.
    await expect(
      repository.replaceSections(a.businessId, site.id, [
        {
          id: site.sections[0].id,
          type: 'HERO',
          content: { headline: 'Must roll back' },
        },
        { type: null as never, content: {} },
      ]),
    ).rejects.toThrow();
    expect(
      await prisma.websiteSection.findMany({
        where: { websiteId: site.id },
        orderBy: { order: 'asc' },
      }),
    ).toEqual(site.sections);
  });
  it('complete concurrent saves cannot interleave into a mixed set', async () => {
    const site = await prisma.website.findUniqueOrThrow({
      where: { businessId: a.businessId },
    });
    const repository = app.get(WebsiteRepository);
    await Promise.all([
      repository.replaceSections(a.businessId, site.id, [
        { type: 'HERO', content: { headline: 'First' } },
        { type: 'ABOUT', content: { title: 'First' } },
      ]),
      repository.replaceSections(a.businessId, site.id, [
        { type: 'HERO', content: { headline: 'Second' } },
      ]),
    ]);
    const sections = await prisma.websiteSection.findMany({
      where: { websiteId: site.id },
      orderBy: { order: 'asc' },
    });
    const names = sections.map(
      (s) =>
        (s.content as Record<string, string>).headline ||
        (s.content as Record<string, string>).title,
    );
    expect(names.every((n) => n === names[0])).toBe(true);
    expect(['First', 'Second']).toContain(names[0]);
    expect(sections.map((s) => s.order)).toEqual(sections.map((_, i) => i));
  });
  it('cannot mark/read or delete another business enquiry by ID', async () => {
    const lead = await prisma.lead.create({
      data: {
        businessId: b.businessId,
        name: 'Visitor',
        message: 'Private',
        source: 'test',
      },
    });
    await request(app.getHttpServer())
      .put(
        '/api/v1/businesses/' +
          a.businessId +
          '/crm/leads/' +
          lead.id +
          '/read',
      )
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(404);
    await request(app.getHttpServer())
      .delete('/api/v1/businesses/' + a.businessId + '/crm/leads/' + lead.id)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(404);
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).isRead,
    ).toBe(false);
  });
  it.each(['products', 'services'])(
    'rejects foreign categories on %s writes',
    async (resource) => {
      const category = await prisma.category.create({
        data: { businessId: b.businessId, name: 'Private', slug: randomUUID() },
      });
      await request(app.getHttpServer())
        .post('/api/v1/businesses/' + a.businessId + '/' + resource)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({
          name: 'Invalid cross-tenant item',
          price: 0,
          categoryId: category.id,
        })
        .expect(400);
      expect(
        await prisma.product.count({
          where: { businessId: a.businessId, categoryId: category.id },
        }),
      ).toBe(0);
      expect(
        await prisma.service.count({
          where: { businessId: a.businessId, categoryId: category.id },
        }),
      ).toBe(0);
    },
  );
  it('accepts zero-priced catalogue entries and scopes updates', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/products')
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ name: 'A valid product', price: 5 })
      .expect(201);
    const id = create.body.data.id;
    await request(app.getHttpServer())
      .put('/api/v1/businesses/' + a.businessId + '/products/' + id)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ price: 0 })
      .expect(200);
    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id } })
      ).price.toString(),
    ).toBe('0');
    await request(app.getHttpServer())
      .put('/api/v1/businesses/' + b.businessId + '/products/' + id)
      .set('Cookie', b.cookies)
      .set('Origin', origin)
      .send({ price: 99 })
      .expect(404);
  });
  it('rejects unsafe image URLs and unknown fields at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/products')
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({
        name: 'Unsafe',
        price: 1,
        images: [{ url: 'javascript:alert(1)', order: 0 }],
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/products')
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ name: 'Unknown field', price: 1, ownerId: b.businessId })
      .expect(400);
  });
  const publicPaths = () => [
    '/businesses/slug/' + a.slug,
    '/websites/public/' + a.businessId,
    '/businesses/' + a.businessId + '/products/public/list',
    '/businesses/' + a.businessId + '/products/public/slug/not-a-product',
    '/businesses/' + a.businessId + '/services/public/list',
    '/businesses/' + a.businessId + '/services/public/slug/not-a-service',
  ];
  it.each([
    'unpublished',
    'expired-trial',
    'expired-active',
    'suspended',
    'deleted',
    'missing-subscription',
  ])('denies every public surface for %s', async (state) => {
    await prisma.business.update({
      where: { id: a.businessId },
      data: {
        isPublished: state !== 'unpublished',
        deletedAt: state === 'deleted' ? new Date() : null,
      },
    });
    await prisma.subscription.update({
      where: { businessId: a.businessId },
      data: {
        status:
          state === 'suspended'
            ? 'SUSPENDED'
            : state === 'expired-active'
              ? 'ACTIVE'
              : 'TRIAL',
        trialEndDate:
          state === 'expired-trial'
            ? new Date(0)
            : new Date(Date.now() + 86400000),
        currentPeriodEnd: new Date(0),
        deletedAt: state === 'missing-subscription' ? new Date() : null,
      },
    });
    for (const path of publicPaths())
      await request(app.getHttpServer())
        .get('/api/v1' + path)
        .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/crm/leads')
      .send({ name: 'Visitor', message: 'No access', source: 'test' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/crm/track/whatsapp')
      .send({ source: 'test' })
      .expect(404);
  });
  it('allows an eligible published site but returns only public fields', async () => {
    await prisma.business.update({
      where: { id: a.businessId },
      data: { isPublished: true, deletedAt: null },
    });
    await prisma.subscription.update({
      where: { businessId: a.businessId },
      data: {
        status: 'TRIAL',
        trialEndDate: new Date(Date.now() + 86400000),
        deletedAt: null,
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/businesses/slug/' + a.slug)
      .expect(200);
    expect(res.body.data.ownerId).toBeUndefined();
    expect(res.body.data.subscription).toBeUndefined();
    const config = await request(app.getHttpServer())
      .get('/api/v1/websites/public/' + a.businessId)
      .expect(200);
    expect(config.body.data.businessId).toBeUndefined();
    const lead = await request(app.getHttpServer())
      .post('/api/v1/businesses/' + a.businessId + '/crm/leads')
      .send({ name: 'Visitor', message: 'Hello', source: 'test' })
      .expect(201);
    expect(Object.keys(lead.body.data)).toEqual(['id']);
  });
  it('denies a physically missing subscription and restores the isolated fixture', async () => {
    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { businessId: a.businessId },
    });
    await prisma.subscription.delete({ where: { businessId: a.businessId } });
    try {
      for (const path of publicPaths())
        await request(app.getHttpServer())
          .get('/api/v1' + path)
          .expect(404);
    } finally {
      await prisma.subscription.create({ data: subscription });
    }
  });
  it('rejects cross-origin cookie mutations', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/businesses/' + a.businessId)
      .set('Cookie', a.cookies)
      .set('Origin', 'https://attacker.invalid')
      .send({ name: 'CSRF' })
      .expect(403);
  });
});
