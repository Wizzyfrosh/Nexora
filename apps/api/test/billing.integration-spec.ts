import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID, createHmac, createHash } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { configuration } from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BusinessModule } from '../src/modules/business/business.module';
import { SubscriptionModule } from '../src/modules/subscription/subscription.module';
import { SubscriptionRepository } from '../src/modules/subscription/subscription.repository';
import { SubscriptionService } from '../src/modules/subscription/subscription.service';
import {
  PaystackService,
  PaystackCharge,
} from '../src/modules/subscription/paystack.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from '../src/common/guards/origin.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Billing on isolated PostgreSQL (only provider transport mocked)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repo: SubscriptionRepository;
  let service: SubscriptionService;
  let provider: PaystackService;
  let verify: jest.SpyInstance;
  let cookies: string[];
  let ownerId: string;
  let subId: string;
  let businessId: string;
  let email: string;
  const secret = 'sk_test_isolated_fake_secret';
  const origin = 'http://localhost:3000';
  let transaction = 1000;
  const charges = new Map<string, PaystackCharge>();
  async function purchase() {
    const reference = 'nexora-' + randomUUID();
    await repo.createPayment({
      subscriptionId: subId,
      amountNgn: 50000,
      currency: 'NGN',
      expectedAmountKobo: 5000000,
      expectedEmail: email,
      purchasedPlan: 'BASIC',
      billingCycle: 'yearly',
      providerPlanCode: 'PLN_test',
      paystackReference: reference,
      paystackStatus: 'PENDING',
    });
    const charge: PaystackCharge = {
      id: ++transaction,
      reference,
      status: 'success',
      amount: 5000000,
      currency: 'NGN',
      paid_at: new Date().toISOString(),
      customer: { email, customer_code: 'CUS_test' },
      metadata: { businessId, planName: 'BASIC' },
    };
    charges.set(reference, charge);
    return charge;
  }
  async function webhook(event: string, reference?: string) {
    const raw = JSON.stringify({ event, data: { reference } });
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/webhook/paystack')
      .set('Content-Type', 'application/json')
      .set(
        'x-paystack-signature',
        createHmac('sha512', secret).update(raw).digest('hex'),
      )
      .send(raw)
      .expect(200);
    return createHash('sha256').update(raw).digest('hex');
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
    process.env.PAYSTACK_SECRET_KEY = secret;
    process.env.FRONTEND_URL = origin;
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        DatabaseModule,
        AuthModule,
        BusinessModule,
        SubscriptionModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true, logger: false });
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
    repo = app.get(SubscriptionRepository);
    service = app.get(SubscriptionService);
    service.onModuleDestroy(); // Drive durable work explicitly, avoiding wall-clock flakes.
    provider = app.get(PaystackService);
    verify = jest
      .spyOn(provider, 'verifyTransaction')
      .mockImplementation(async (reference) => {
        const data = charges.get(reference);
        if (!data) throw new Error('Unknown provider transaction');
        return { data };
      });
  });
  beforeEach(async () => {
    // Only this explicitly isolated disposable database is ever cleaned.
    await prisma.paymentEvent.deleteMany();
    email = randomUUID() + '@example.test';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Origin', origin)
      .send({
        firstName: 'Billing',
        lastName: randomUUID(),
        email,
        password: 'BillingTest123!',
      })
      .expect(201);
    businessId = res.body.data.business.id;
    ownerId = res.body.data.id;
    cookies = (res.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0],
    );
    subId = (
      await prisma.subscription.findUniqueOrThrow({ where: { businessId } })
    ).id;
    verify.mockClear();
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('persists the immutable purchase and recovery work before checkout opens', async () => {
    await prisma.plan.upsert({
      where: { name: 'BASIC' },
      update: {},
      create: {
        name: 'BASIC',
        displayName: 'Basic',
        priceNgn: 50000,
        billingCycle: 'yearly',
        paystackPlanCode: 'PLN_test',
      },
    });
    const init = jest
      .spyOn(provider, 'initializeTransaction')
      .mockImplementationOnce(
        async (_email, amount, _plan, _callback, reference) => {
          const payment = await repo.findPayment(reference);
          expect(payment!.expectedAmountKobo).toBe(amount);
          expect(
            await prisma.paymentEvent.findUnique({
              where: { id: 'reconcile:' + reference },
            }),
          ).not.toBeNull();
          return {
            data: {
              reference,
              authorization_url: 'https://checkout.paystack.com/fake',
            },
          };
        },
      );
    try {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/' + businessId + '/initiate')
        .set('Cookie', cookies)
        .set('Origin', origin)
        .send({ plan: 'BASIC', callbackUrl: origin + '/dashboard/billing' })
        .expect(201);
      expect(res.body.data.reference).toMatch(/^nexora-/);
      expect(init).toHaveBeenCalledTimes(1);
    } finally {
      init.mockRestore();
    }
  });

  it('webhook fulfilment before callback grants one term', async () => {
    const charge = await purchase();
    await webhook('charge.success', charge.reference);
    await service.recoverPendingEvents();
    const first = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/verify/' + charge.reference)
      .set('Cookie', cookies)
      .expect(200);
    expect(
      await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }),
    ).toEqual(first);
  });

  it('exhausted retries move to review rather than silently losing the charge', async () => {
    const id = await webhook('charge.success', 'unknown-' + randomUUID());
    await prisma.paymentEvent.update({ where: { id }, data: { attempts: 7 } });
    await service.recoverPendingEvents();
    const event = await prisma.paymentEvent.findUniqueOrThrow({
      where: { id },
    });
    expect(event.attempts).toBe(8);
    expect(event.status).toBe('REVIEW');
  });

  it('handles simultaneous redirect and webhook once, including later replay', async () => {
    const charge = await purchase();
    const id = await webhook('charge.success', charge.reference);
    await Promise.all([
      request(app.getHttpServer())
        .get('/api/v1/subscriptions/verify/' + charge.reference)
        .set('Cookie', cookies)
        .expect(200),
      service.recoverPendingEvents(),
    ]);
    const first = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(first.status).toBe('ACTIVE');
    const end = new Date(charge.paid_at);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    expect(first.currentPeriodEnd).toEqual(end);
    expect(first.paystackSubscriptionId).toBeNull();
    await webhook('charge.success', charge.reference);
    await service.verifyPayment(ownerId, charge.reference);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .currentPeriodEnd,
    ).toEqual(first.currentPeriodEnd);
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('DONE');
  });
  it('serializes two different purchases without losing a paid term', async () => {
    const a = await purchase();
    const b = await purchase();
    await Promise.all([
      service.verifyPayment(ownerId, a.reference),
      service.verifyPayment(ownerId, b.reference),
    ]);
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(sub.currentPeriodEnd!.getUTCFullYear()).toBe(
      new Date().getUTCFullYear() + 2,
    );
    expect(
      await prisma.payment.count({
        where: { subscriptionId: subId, fulfilledAt: { not: null } },
      }),
    ).toBe(2);
  });
  it.each([
    { amount: 1 },
    { currency: 'USD' },
    { reference: 'other' },
    { customer: { email: 'wrong@test', customer_code: 'CUS_bad' } },
  ])(
    'rejects altered provider details without changing the trial: %j',
    async (change) => {
      const charge = await purchase();
      const reference = charge.reference;
      Object.assign(charge, change);
      await request(app.getHttpServer())
        .get('/api/v1/subscriptions/verify/' + reference)
        .set('Cookie', cookies)
        .expect(400);
      expect(
        (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
          .status,
      ).toBe('TRIAL');
      expect((await repo.findPayment(reference))!.fulfilledAt).toBeNull();
    },
  );
  it('does not let a different authentic owner verify a purchase', async () => {
    const charge = await purchase();
    await prisma.business.update({
      where: { id: businessId },
      data: {
        ownerId: (
          await prisma.user.create({
            data: {
              email: randomUUID() + '@example.test',
              passwordHash: 'not-a-login',
              firstName: 'Other',
              lastName: 'Owner',
            },
          })
        ).id,
      },
    });
    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/verify/' + charge.reference)
      .set('Cookie', cookies)
      .expect(404);
    expect(verify).not.toHaveBeenCalled();
  });
  it('verifies the exact HTTP body and deduplicates receipt', async () => {
    const raw =
      '{ "event": "charge.success", "data": {"reference":"unknown"} }';
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .post('/api/v1/subscriptions/webhook/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', sig)
        .send(raw)
        .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/webhook/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(JSON.stringify(JSON.parse(raw)))
      .expect(400);
    const id = createHash('sha256').update(raw).digest('hex');
    expect(await prisma.paymentEvent.count({ where: { id } })).toBe(1);
  });
  it('rolls back the payment and entitlement together on a late unique constraint failure', async () => {
    const a = await purchase();
    await service.verifyPayment(ownerId, a.reference);
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    const b = await purchase();
    b.id = a.id;
    await expect(service.verifyPayment(ownerId, b.reference)).rejects.toThrow();
    expect((await repo.findPayment(b.reference))!.fulfilledAt).toBeNull();
    expect(
      await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }),
    ).toEqual(before);
  });
  it('retains durable receipt after provider failure and recovers once', async () => {
    const charge = await purchase();
    const id = await webhook('charge.success', charge.reference);
    verify.mockRejectedValueOnce(new Error('Provider timeout'));
    await service.recoverPendingEvents();
    expect((await repo.findPayment(charge.reference))!.fulfilledAt).toBeNull();
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('PENDING');
    await prisma.paymentEvent.update({
      where: { id },
      data: { nextAttemptAt: new Date(0) },
    });
    await service.recoverPendingEvents();
    expect(
      (await repo.findPayment(charge.reference))!.fulfilledAt,
    ).not.toBeNull();
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('DONE');
  });
  it('quarantines cancellation/failure events and preserves paid access', async () => {
    const charge = await purchase();
    await service.verifyPayment(ownerId, charge.reference);
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    const id = await webhook('subscription.disable');
    await webhook('invoice.payment_failed');
    await service.recoverPendingEvents();
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('REVIEW');
    expect(
      await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }),
    ).toEqual(before);
  });
  it('recovers a purchase without a browser callback or webhook', async () => {
    const charge = await purchase();
    await prisma.paymentEvent.update({
      where: { id: 'reconcile:' + charge.reference },
      data: { nextAttemptAt: new Date(0) },
    });
    await service.recoverPendingEvents();
    expect(
      (await repo.findPayment(charge.reference))!.fulfilledAt,
    ).not.toBeNull();
  });
  it('does not let payment reactivate a suspended subscription', async () => {
    const charge = await purchase();
    await prisma.subscription.update({
      where: { id: subId },
      data: { status: 'SUSPENDED' },
    });
    await expect(
      service.verifyPayment(ownerId, charge.reference),
    ).rejects.toThrow('requires review');
    expect((await repo.findPayment(charge.reference))!.fulfilledAt).toBeNull();
  });
  it('expiry cleanup cannot overwrite a concurrent renewal', async () => {
    await prisma.subscription.update({
      where: { id: subId },
      data: { status: 'ACTIVE', plan: 'BASIC', currentPeriodEnd: new Date(0) },
    });
    const charge = await purchase();
    await Promise.all([
      service.verifyPayment(ownerId, charge.reference),
      repo.expire(new Date()),
    ]);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .status,
    ).toBe('ACTIVE');
  });
});
