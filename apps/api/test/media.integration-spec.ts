import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Server } from 'node:http';
import { configuration } from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BusinessModule } from '../src/modules/business/business.module';
import { ProductModule } from '../src/modules/product/product.module';
import { ServiceModule } from '../src/modules/service/service.module';
import { WebsiteModule } from '../src/modules/website/website.module';
import { MediaModule } from '../src/modules/media/media.module';
import { MediaService } from '../src/modules/media/media.service';
import { MediaRepository } from '../src/modules/media/media.repository';
import { NeonStorageTransport } from '../src/modules/media/neon-storage.transport';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

type Owner = { id: string; userId: string; cookies: string[] };
function payload<T = { id: string; url: string }>(response: {
  body: unknown;
}): T {
  return (response.body as { data: T }).data;
}
describe('Secure media on isolated PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let a: Owner;
  let b: Owner;
  let png: Buffer;
  const origin = 'http://localhost:3000';
  const upload = jest.fn<Promise<void>, [string, Buffer]>();
  const destroy = jest.fn<Promise<void>, []>();
  const configured = jest.fn<void, []>();
  async function owner(): Promise<Owner> {
    const r = await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        email: randomUUID() + '@example.test',
        password: 'MediaTest123!',
        firstName: 'Media',
        lastName: randomUUID(),
      })
      .expect(201);
    const user = payload<{ id: string; business: { id: string } }>(r);
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    return {
      id: user.business.id,
      userId: user.id,
      cookies: (r.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0],
      ),
    };
  }
  const path = (o: Owner) => `/api/v1/businesses/${o.id}/media`;
  const post = (o: Owner, target = o) =>
    request(app.getHttpServer() as Server)
      .post(path(target))
      .set('Origin', origin)
      .set('Cookie', o.cookies);
  async function asset(o = a) {
    return payload(
      await post(o)
        .attach('file', png, {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(201),
    );
  }
  beforeAll(async () => {
    const value = process.env.SECURITY_TEST_DATABASE_URL;
    const url = new URL(value || 'https://missing.invalid');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/nexora_security' ||
      !['postgres:', 'postgresql:'].includes(url.protocol)
    )
      throw new Error('Isolated nexora_security database required');
    process.env.DATABASE_URL = value;
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        DatabaseModule,
        AuthModule,
        BusinessModule,
        ProductModule,
        ServiceModule,
        WebsiteModule,
        MediaModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    })
      .overrideProvider(NeonStorageTransport)
      .useValue({
        configured,
        upload,
        destroy,
        url: (id: string) =>
          `https://br-fixture.storage.c-7.eu-central-1.aws.neon.tech/nexora-public/${id}.webp`,
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    app.get(MediaService).onModuleDestroy();
    png = await sharp({
      create: { width: 10, height: 8, channels: 3, background: '#aabbcc' },
    })
      .png()
      .toBuffer();
  });
  beforeEach(async () => {
    configured.mockReset();
    upload.mockReset();
    destroy.mockReset();
    destroy.mockResolvedValue(undefined);
    upload.mockResolvedValue(undefined);
    a = await owner();
    b = await owner();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('sanitizes, records verified ownership and lists only ready tenant assets', async () => {
    const image = await asset();
    expect(image.url).toContain(`/nexora/${a.id}/`);
    const row = await prisma.media.findUniqueOrThrow({
      where: { id: image.id },
    });
    expect(row.status).toBe('READY');
    expect((await sharp(upload.mock.calls[0][1]).metadata()).format).toBe(
      'webp',
    );
    expect(
      payload<unknown>(
        await request(app.getHttpServer() as Server)
          .get(path(b))
          .set('Cookie', b.cookies)
          .expect(200),
      ),
    ).toEqual([]);
  });
  it('rejects foreign tenant routes and unverified owners', async () => {
    await post(b, a).attach('file', png, 'photo.png').expect(403);
    expect(upload).not.toHaveBeenCalled();
    await prisma.user.update({
      where: { id: a.userId },
      data: { emailVerified: false },
    });
    await post(a).attach('file', png, 'photo.png').expect(403);
  });
  it('rejects missing, spoofed, SVG, oversized and extra multipart fields', async () => {
    await post(a).expect(400);
    await post(a)
      .attach('file', Buffer.from('<svg/>'), {
        filename: 'a.png',
        contentType: 'image/png',
      })
      .expect(400);
    await post(a)
      .attach('file', png, { filename: 'a.svg', contentType: 'image/svg+xml' })
      .expect(400);
    await post(a)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      })
      .expect(413);
    await post(a)
      .field('publicId', 'foreign')
      .attach('file', png, 'photo.png')
      .expect(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('fails closed when storage is missing and reserves nothing', async () => {
    configured.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    await post(a).attach('file', png, 'photo.png').expect(500);
    expect(await prisma.media.count({ where: { businessId: a.id } })).toBe(0);
  });
  it('retains cleanup work when object storage upload fails', async () => {
    upload.mockRejectedValue(new Error('Neon unavailable'));
    await post(a).attach('file', png, 'photo.png').expect(500);
    expect(await prisma.media.count({ where: { businessId: a.id, status: 'DELETING' } })).toBe(1);
  });
  it('blocks arbitrary and foreign image URLs on product/service/branding/section writes', async () => {
    const image = await asset(b);
    for (const url of [image.url, 'https://example.test/a.png']) {
      await request(app.getHttpServer() as Server)
        .post(`/api/v1/businesses/${a.id}/products`)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ name: randomUUID(), price: 100, images: [{ url, order: 0 }] })
        .expect(400);
      await request(app.getHttpServer() as Server)
        .post(`/api/v1/businesses/${a.id}/services`)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ name: randomUUID(), images: [url] })
        .expect(400);
      await request(app.getHttpServer() as Server)
        .put(`/api/v1/businesses/${a.id}`)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ logoUrl: url })
        .expect(400);
      await request(app.getHttpServer() as Server)
        .put(`/api/v1/websites/${a.id}/sections`)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ sections: [{ type: 'HERO', content: { imageUrl: url } }] })
        .expect(400);
    }
  });
  it('attaches and replaces product images transactionally and prevents in-use deletion', async () => {
    const image = await asset();
    const p = await request(app.getHttpServer() as Server)
      .post(`/api/v1/businesses/${a.id}/products`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({
        name: randomUUID(),
        price: 100,
        images: [{ url: image.url, order: 0 }],
      })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(409);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/businesses/${a.id}/products/${payload(p).id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ images: [] })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(200);
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/businesses/${a.id}/products`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({
        name: randomUUID(),
        price: 100,
        images: [{ url: image.url, order: 0 }],
      })
      .expect(400);
  });
  it('rejects foreign deletion without calling the provider', async () => {
    const image = await asset();
    await request(app.getHttpServer() as Server)
      .delete(`${path(b)}/${image.id}`)
      .set('Cookie', b.cookies)
      .set('Origin', origin)
      .expect(404);
    expect(destroy).not.toHaveBeenCalled();
  });
  it('protects service, branding and section attachments and allows removal before deletion', async () => {
    const image = await asset();
    const s = await request(app.getHttpServer() as Server)
      .post(`/api/v1/businesses/${a.id}/services`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ name: randomUUID(), images: [image.url] })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(409);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/businesses/${a.id}/services/${payload(s).id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ images: [] })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/businesses/${a.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ bannerUrl: image.url })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(409);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/businesses/${a.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ bannerUrl: '' })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/websites/${a.id}/sections`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ sections: [{ type: 'HERO', content: { imageUrl: image.url } }] })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(409);
    await request(app.getHttpServer() as Server)
      .put(`/api/v1/websites/${a.id}/sections`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .send({ sections: [] })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .delete(`${path(a)}/${image.id}`)
      .set('Cookie', a.cookies)
      .set('Origin', origin)
      .expect(200);
  });
  it('cleans expired reservations and escalates repeated delete failures without releasing quota', async () => {
    const pending = await app.get(MediaRepository).reserve(a.id);
    await prisma.media.update({
      where: { id: pending.id },
      data: { cleanupAt: new Date(0), attempts: 4 },
    });
    destroy.mockRejectedValue(new Error('provider offline'));
    await app.get(MediaService).cleanup();
    const row = await prisma.media.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(row.status).toBe('REVIEW');
    expect(row.cleanupAt).toBeNull();
    expect(row.sizeBytes).toBe(5 * 1024 * 1024);
  });
  it('serializes attachment versus deletion (never a dangling accepted reference)', async () => {
    const image = await asset();
    const [attach, remove] = await Promise.all([
      request(app.getHttpServer() as Server)
        .put(`/api/v1/businesses/${a.id}`)
        .set('Cookie', a.cookies)
        .set('Origin', origin)
        .send({ logoUrl: image.url }),
      request(app.getHttpServer() as Server)
        .delete(`${path(a)}/${image.id}`)
        .set('Cookie', a.cookies)
        .set('Origin', origin),
    ]);
    expect([attach.status, remove.status]).not.toEqual([200, 200]);
    expect([
      [200, 409],
      [400, 200],
    ]).toContainEqual([attach.status, remove.status]);
  });
  it('serializes quota reservations across concurrent uploads', async () => {
    await prisma.media.createMany({
      data: Array.from({ length: 99 }, (_, i) => ({
        businessId: a.id,
        type: 'GALLERY_IMAGE' as const,
        status: 'READY',
        publicId: `fixture-${i}`,
        url: `https://example.test/${i}`,
        sizeBytes: 1,
      })),
    });
    const repo = app.get(MediaRepository);
    const results = await Promise.allSettled([
      repo.reserve(a.id),
      repo.reserve(a.id),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('claims cleanup once across workers, retries failure and records provider deletion', async () => {
    const image = await asset();
    await app.get(MediaRepository).remove(a.id, image.id);
    const repo = app.get(MediaRepository);
    const jobs = await Promise.all([repo.claimCleanup(), repo.claimCleanup()]);
    expect(jobs.flat().filter((j) => j.id === image.id)).toHaveLength(1);
    await prisma.media.update({
      where: { id: image.id },
      data: { cleanupAt: new Date(0) },
    });
    destroy.mockRejectedValueOnce(new Error('offline'));
    await app.get(MediaService).cleanup();
    expect(
      (await prisma.media.findUniqueOrThrow({ where: { id: image.id } }))
        .attempts,
    ).toBe(1);
    await prisma.media.update({
      where: { id: image.id },
      data: { cleanupAt: new Date(0) },
    });
    await app.get(MediaService).cleanup();
    expect(
      (await prisma.media.findUniqueOrThrow({ where: { id: image.id } }))
        .status,
    ).toBe('DELETED');
  });
  it('rejects cross-origin multipart uploads', async () => {
    await request(app.getHttpServer() as Server)
      .post(path(a))
      .set('Cookie', a.cookies)
      .set('Origin', 'https://evil.test')
      .attach('file', png, 'photo.png')
      .expect(403);
  });
});
