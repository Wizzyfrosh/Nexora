import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { configuration } from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import {
  AccountMailService,
  AccountMailTransport,
} from '../src/modules/auth/account-mail.service';
import { AccountSecurityRepository } from '../src/modules/auth/account-security.repository';
import { tokenHash } from '../src/modules/auth/account-security';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Account security on isolated PostgreSQL (SMTP transport only mocked)', () => {
  let app: INestApplication, prisma: PrismaService, mail: AccountMailService;
  let email: string, userId: string, cookies: string[];
  const origin = 'http://localhost:3000';
  const delivered: { to: string; text: string }[] = [];
  const send = jest.fn(async (to: string, _subject: string, text: string) => {
    delivered.push({ to, text });
  });
  const cookie = (values: string[], name: string) =>
    values.find((c) => c.startsWith(name + '='))!.split('=')[1];
  const rawToken = (text: string) =>
    new URL(text.match(/http:\/\/localhost:3000\/[^\s]+/)![0]).hash.slice(7);
  async function post(path: string, body: object, auth = cookies) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/' + path)
      .set('Origin', origin)
      .set('Cookie', auth)
      .send(body);
  }
  async function resetLink() {
    await post('forgot-password', { email }).then((r) =>
      expect(r.status).toBe(200),
    );
    await mail.deliverPending();
    return rawToken(
      delivered
        .filter((m) => m.to === email && m.text.includes('/reset-password'))
        .at(-1)!.text,
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
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              ...configuration(),
              frontendUrl: origin,
              email: {
                host: 'smtp.example.test',
                port: 587,
                user: 'fixture',
                pass: 'fixture',
                from: 'nexora@example.test',
                tokenKey: 'ab'.repeat(32),
              },
            }),
          ],
        }),
        DatabaseModule,
        AuthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    })
      .overrideProvider(AccountMailTransport)
      .useValue({ send })
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
    mail = app.get(AccountMailService);
    mail.onModuleDestroy();
  });
  beforeEach(async () => {
    send.mockReset();
    send.mockImplementation(
      async (to: string, _subject: string, text: string) => {
        delivered.push({ to, text });
      },
    );
    // Only explicitly isolated disposable mail fixtures are cleared.
    await prisma.accountMail.deleteMany();
    delivered.length = 0;
    email = randomUUID() + '@example.test';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        email,
        password: 'PasswordTest123!',
        firstName: 'Account',
        lastName: randomUUID(),
      })
      .expect(201);
    userId = res.body.data.id;
    cookies = (res.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('stores only refresh/action hashes and encrypted mail links, then clears sent ciphertext', async () => {
    const refresh = cookie(cookies, 'refresh_token');
    const session = await prisma.refreshToken.findUniqueOrThrow({
      where: { token: tokenHash(refresh) },
    });
    expect(session.token).not.toBe(refresh);
    expect(session.familyId).not.toBeNull();
    const queued = await prisma.accountMail.findFirstOrThrow({
      where: { userId },
    });
    expect(queued.encryptedToken).not.toContain('verify_');
    await mail.deliverPending();
    const token = rawToken(delivered[0].text);
    expect(
      await prisma.emailVerificationToken.findUnique({
        where: { token: tokenHash(token) },
      }),
    ).not.toBeNull();
    expect(
      (await prisma.accountMail.findUniqueOrThrow({ where: { id: queued.id } }))
        .encryptedToken,
    ).toBe('');
    expect(token).not.toContain('sha256:');
  });
  it('verification is single-use under concurrent requests and does not auto-consume on GET', async () => {
    await mail.deliverPending();
    const token = rawToken(delivered[0].text);
    await request(app.getHttpServer())
      .get('/api/v1/auth/verify-email?token=' + token)
      .expect(404);
    const results = await Promise.all([
      post('verify-email', { token }),
      post('verify-email', { token }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .emailVerified,
    ).toBe(true);
  });
  it('reset revokes both access and refresh tokens and invalidates the old password', async () => {
    const token = await resetLink();
    const changed = await post('reset-password', {
      token,
      password: 'NewPassword456!',
    });
    expect(changed.status).toBe(200);
    expect(
      (changed.headers['set-cookie'] as unknown as string[]).every((c) =>
        c.includes('Expires=Thu, 01 Jan 1970'),
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(401);
    expect((await post('refresh', {})).status).toBe(401);
    expect(
      (await post('login', { email, password: 'PasswordTest123!' }, [])).status,
    ).toBe(401);
    expect(
      (await post('login', { email, password: 'NewPassword456!' }, [])).status,
    ).toBe(200);
    expect(
      (
        await post(
          'reset-password',
          { token, password: 'AgainPassword789!' },
          [],
        )
      ).status,
    ).toBe(400);
  });
  it('two simultaneous reset requests consume one link only', async () => {
    const token = await resetLink();
    const result = await Promise.all([
      post('reset-password', { token, password: 'FirstPassword456!' }),
      post('reset-password', { token, password: 'SecondPassword789!' }),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([200, 400]);
  });
  it('rejects expired and wrong-purpose action tokens', async () => {
    await mail.deliverPending();
    const verify = rawToken(delivered[0].text);
    expect(
      (
        await post('reset-password', {
          token: verify,
          password: 'NewPassword456!',
        })
      ).status,
    ).toBe(400);
    const reset = await resetLink();
    await prisma.passwordResetToken.update({
      where: { token: tokenHash(reset) },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (
        await post('reset-password', {
          token: reset,
          password: 'NewPassword456!',
        })
      ).status,
    ).toBe(400);
  });
  it('accepts refresh cookies with an empty body and rotates to a distinct hash', async () => {
    const result = await post('refresh', {});
    expect(result.status).toBe(200);
    const next = (result.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
    expect(cookie(next, 'refresh_token')).not.toBe(
      cookie(cookies, 'refresh_token'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', next)
      .expect(200);
  });
  it('replaying a rotated token revokes the entire family, including its new access token', async () => {
    const result = await post('refresh', {});
    expect(result.status).toBe(200);
    const next = (result.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
    expect((await post('refresh', {})).status).toBe(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', next)
      .expect(401);
  });
  it('concurrent rotation cannot leave two active descendants', async () => {
    const result = await Promise.all([
      post('refresh', {}),
      post('refresh', {}),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([200, 401]);
    expect(
      await prisma.refreshToken.count({ where: { userId, revokedAt: null } }),
    ).toBe(0);
  });
  it('logout works after access expiry and does not affect another login family', async () => {
    const login = await post(
      'login',
      { email, password: 'PasswordTest123!' },
      [],
    );
    const other = (login.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
    const refreshOnly = cookies.filter((c) => c.startsWith('refresh_token='));
    expect((await post('logout', {}, refreshOnly)).status).toBe(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', other)
      .expect(200);
  });
  it('normalizes email before lookup and prevents case-variant duplicate signup', async () => {
    const res = await post(
      'signup',
      {
        email: '  ' + email.toUpperCase() + ' ',
        password: 'PasswordTest123!',
        firstName: 'Other',
        lastName: 'Owner',
      },
      [],
    );
    expect(res.status).toBe(409);
    expect(
      (
        await post(
          'login',
          {
            email: ' ' + email.toUpperCase() + ' ',
            password: 'PasswordTest123!',
          },
          [],
        )
      ).status,
    ).toBe(200);
  });
  it('generic recovery responses do not reveal account existence, raw tokens or SMTP outcome', async () => {
    const known = await post('forgot-password', { email }, []);
    const unknown = await post(
      'forgot-password',
      { email: randomUUID() + '@example.test' },
      [],
    );
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toEqual(unknown.body.message);
    expect(known.body.data).toEqual(unknown.body.data);
    expect(send).not.toHaveBeenCalled();
    expect(JSON.stringify(known.body)).not.toMatch(/reset_|verify_/);
  });
  it('retains durable mail after SMTP failure and retries without exposing the link', async () => {
    send.mockRejectedValueOnce(new Error('Provider secret error'));
    await mail.deliverPending();
    const row = await prisma.accountMail.findFirstOrThrow({
      where: { userId },
    });
    expect(row.status).toBe('PENDING');
    expect(row.attempts).toBe(1);
    await prisma.accountMail.update({
      where: { id: row.id },
      data: { nextAttemptAt: new Date(0) },
    });
    await mail.deliverPending();
    expect(
      (await prisma.accountMail.findUniqueOrThrow({ where: { id: row.id } }))
        .status,
    ).toBe('SENT');
  });
  it('supersedes old links and enforces a durable resend cooldown', async () => {
    await mail.deliverPending();
    const old = rawToken(delivered[0].text);
    expect((await post('resend-verification', {})).body.data.delivery).toBe(
      'UNCHANGED',
    );
    await prisma.emailVerificationToken.updateMany({
      where: { email },
      data: { createdAt: new Date(0) },
    });
    expect((await post('resend-verification', {})).body.data.delivery).toBe(
      'QUEUED',
    );
    expect((await post('verify-email', { token: old })).status).toBe(400);
    await mail.deliverPending();
    const latest = rawToken(delivered.at(-1)!.text);
    expect((await post('verify-email', { token: latest })).status).toBe(200);
  });
  it('rejects cross-origin cookie refresh and does not consume its token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .set('Origin', 'https://attacker.invalid')
      .send({})
      .expect(403);
    expect((await post('refresh', {})).status).toBe(200);
  });
});
