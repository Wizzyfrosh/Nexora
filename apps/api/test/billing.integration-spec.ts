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
import { BillingLifecycleService } from '../src/modules/subscription/billing-lifecycle.service';
import {
  PaystackService,
  PaystackCharge,
  PaystackSubscription,
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
  const agreements = new Map<string, PaystackSubscription>();
  let cancel: jest.SpyInstance;
  async function sendEvent(event: string, data: Record<string, unknown>) {
    const raw = JSON.stringify({ event, data });
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
  async function agreement(timestampStyle: 'camel' | 'snake' = 'camel') {
    const initial = await purchase();
    await service.verifyPayment(ownerId, initial.reference);
    const start = new Date(initial.paid_at),
      end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    const data: PaystackSubscription = {
      subscription_code: 'SUB_' + randomUUID().replaceAll('-', ''),
      domain: 'test',
      status: 'active',
      amount: 5000000,
      updatedAt: new Date().toISOString(),
      customer: { email, customer_code: 'CUS_test' },
      email_token: 'transient-token',
      plan: {
        plan_code: 'PLN_test',
        amount: 5000000,
        currency: 'NGN',
        interval: 'annually',
      },
      most_recent_invoice: {
        invoice_code: 'INV_' + transaction,
        transaction: initial.id,
        paid: true,
        amount: 5000000,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      },
    };
    if (timestampStyle === 'snake') {
      data.updated_at = data.updatedAt;
      delete data.updatedAt;
    }
    agreements.set(data.subscription_code, data);
    await sendEvent('subscription.create', {
      subscription_code: data.subscription_code,
    });
    await service.recoverPendingEvents();
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .paystackSubscriptionId,
    ).toBe(data.subscription_code);
    return data;
  }
  function renewal(data: PaystackSubscription, start = new Date()) {
    const end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    const charge: PaystackCharge = {
      id: ++transaction,
      reference: 'renewal-' + randomUUID(),
      status: 'success',
      amount: 5000000,
      currency: 'NGN',
      paid_at: start.toISOString(),
      metadata: null,
      customer: { email, customer_code: 'CUS_test' },
    };
    charges.set(charge.reference, charge);
    const invoice = {
      invoice_code: 'INV_' + transaction,
      amount: charge.amount,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      paid: true,
      subscription: { subscription_code: data.subscription_code },
      customer: charge.customer,
      transaction: {
        reference: charge.reference,
        amount: charge.amount,
        currency: charge.currency,
      },
    };
    return { charge, invoice, end };
  }
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
    jest
      .spyOn(provider, 'fetchSubscription')
      .mockImplementation(async (code) => {
        const data = agreements.get(code);
        if (!data) throw new Error('Provider subscription unavailable');
        return { data: structuredClone(data) };
      });
    jest.spyOn(provider, 'fetchTransaction').mockImplementation(async (id) => {
      const data = [...charges.values()].find((c) => String(c.id) === id);
      if (!data) throw new Error('Provider transaction unavailable');
      return { data };
    });
    cancel = jest
      .spyOn(provider, 'cancelSubscription')
      .mockImplementation(async (code) => {
        const data = agreements.get(code)!;
        data.status = 'non-renewing';
        data.updatedAt = new Date(Date.now() + 1000).toISOString();
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
    cancel.mockClear();
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('links a snake-case provider timestamp and still rejects an older provider snapshot', async () => {
    const data = await agreement('snake');
    const linked = await repo.findLinked(data.subscription_code);
    expect(linked!.providerStatusUpdatedAt).toEqual(new Date(data.updated_at!));
    const expiry = linked!.currentPeriodEnd;
    await repo.linkAndSync(linked!.billingAnchorPayment!, {
      ...data, status: 'non-renewing', updated_at: '2020-01-01T00:00:00Z',
    });
    const saved = await repo.findLinked(data.subscription_code);
    expect(saved!.renewalStatus).toBe('active');
    expect(saved!.currentPeriodEnd).toEqual(expiry);
  });

  it('links subscription codes by exact original transaction, without extending the initial invoice', async () => {
    const data = await agreement();
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subId },
    });
    expect(payments).toHaveLength(1);
    expect(sub.billingAnchorPaymentId).toBe(payments[0].id);
    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/' + businessId + '/status')
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.data.linked).toBe(true);
    expect(res.body.data.renewalStatus).toBe('active');
    expect(JSON.stringify(res.body)).not.toContain('transient-token');
    expect(data.subscription_code).not.toMatch(/^AUTH_/);
  });
  it('renews an expired paid term once despite concurrent duplicate invoices', async () => {
    const data = await agreement();
    const r = renewal(data);
    await prisma.subscription.update({
      where: { id: subId },
      data: {
        currentPeriodEnd: new Date(Date.now() - 1000),
        status: 'EXPIRED',
      },
    });
    const id = await sendEvent('invoice.update', r.invoice);
    const other = await sendEvent('invoice.update', {
      ...r.invoice,
      unused: 'different delivery',
    });
    const events = await prisma.paymentEvent.findMany({
      where: { id: { in: [id, other] } },
    });
    await Promise.all(
      events.map((event) =>
        app.get(BillingLifecycleService).process(event, async (ref) => {
          await service.verifyPayment(ownerId, ref);
        }),
      ),
    );
    await service.recoverPendingEvents();
    await service.verifyPayment(ownerId, r.charge.reference);
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(sub.currentPeriodEnd).toEqual(r.end);
    expect(sub.status).toBe('ACTIVE');
    expect(
      await prisma.payment.count({
        where: { providerInvoiceCode: r.invoice.invoice_code },
      }),
    ).toBe(1);
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('DONE');
  });
  it('does not truncate a newer entitlement when an older paid invoice arrives', async () => {
    const data = await agreement();
    const r = renewal(data);
    const future = new Date(r.end);
    future.setUTCFullYear(future.getUTCFullYear() + 1);
    await prisma.subscription.update({
      where: { id: subId },
      data: { currentPeriodEnd: future },
    });
    await sendEvent('invoice.update', r.invoice);
    await service.recoverPendingEvents();
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .currentPeriodEnd,
    ).toEqual(future);
  });
  it('preserves paid access on cancellation and confirms the durable intent with a fresh read', async () => {
    await agreement();
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/v1/subscriptions/' + businessId + '/cancel-renewal')
          .set('Cookie', cookies)
          .set('Origin', origin)
          .expect(202),
      ),
    );
    await service.recoverPendingEvents();
    const pending = await prisma.paymentEvent.findFirstOrThrow({
      where: {
        event: 'subscription.cancel',
        providerObjectId: before.paystackSubscriptionId,
      },
    });
    expect(pending.status).toBe('PENDING');
    expect(cancel).toHaveBeenCalledTimes(1);
    await prisma.paymentEvent.update({
      where: { id: pending.id },
      data: { nextAttemptAt: new Date(0) },
    });
    await service.recoverPendingEvents();
    const after = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(after.renewalStatus).toBe('non-renewing');
    expect(after.status).toBe('ACTIVE');
    expect(after.currentPeriodEnd).toEqual(before.currentPeriodEnd);
    expect(
      (
        await prisma.paymentEvent.findUniqueOrThrow({
          where: { id: pending.id },
        })
      ).status,
    ).toBe('DONE');
    expect(
      await prisma.auditLog.count({
        where: { entityId: subId, action: 'SUBSCRIPTION_CANCEL_REQUESTED' },
      }),
    ).toBe(1);
  });
  it('uses current provider status instead of an old cancellation event', async () => {
    const data = await agreement();
    await sendEvent('subscription.disable', {
      subscription_code: data.subscription_code,
      status: 'cancelled',
    });
    await service.recoverPendingEvents();
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(sub.renewalStatus).toBe('active');
    expect(sub.status).toBe('ACTIVE');
  });
  it('payment failure does not remove time already paid for', async () => {
    const data = await agreement();
    data.status = 'attention';
    data.updatedAt = new Date(Date.now() + 1000).toISOString();
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    await sendEvent('invoice.payment_failed', {
      subscription: { subscription_code: data.subscription_code },
    });
    await service.recoverPendingEvents();
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subId },
    });
    expect(sub.renewalStatus).toBe('attention');
    expect(sub.status).toBe('ACTIVE');
    expect(sub.currentPeriodEnd).toEqual(before.currentPeriodEnd);
  });
  it('rejects renewal amount and customer mismatches without granting access', async () => {
    const data = await agreement();
    const r = renewal(data);
    r.charge.amount = 1;
    const id = await sendEvent('invoice.update', r.invoice);
    await service.recoverPendingEvents();
    expect(await repo.findPayment(r.charge.reference)).toBeNull();
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('PENDING');
  });
  it('recovers the latest paid invoice through periodic provider reconciliation', async () => {
    const data = await agreement();
    const r = renewal(data);
    data.most_recent_invoice = {
      invoice_code: r.invoice.invoice_code,
      transaction: r.charge.id,
      amount: r.charge.amount,
      period_start: r.invoice.period_start,
      period_end: r.invoice.period_end,
      paid: true,
    };
    await prisma.subscription.update({
      where: { id: subId },
      data: {
        nextProviderSyncAt: new Date(0),
        currentPeriodEnd: new Date(0),
        status: 'EXPIRED',
      },
    });
    await service.recoverPendingEvents();
    expect(
      (await repo.findPayment(r.charge.reference))!.fulfilledAt,
    ).not.toBeNull();
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .currentPeriodEnd,
    ).toEqual(r.end);
  });
  it('does not attach a provider subscription using email and plan alone', async () => {
    const data = await agreement();
    const code = 'SUB_unproven' + transaction;
    agreements.set(code, {
      ...data,
      subscription_code: code,
      most_recent_invoice: null,
    });
    const id = await sendEvent('subscription.create', {
      subscription_code: code,
    });
    await service.recoverPendingEvents();
    expect(
      (await prisma.paymentEvent.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('PENDING');
    expect(
      await prisma.subscription.findUnique({
        where: { paystackSubscriptionId: code },
      }),
    ).toBeNull();
  });

  it('rejects owner substitution on status and cancellation before touching the provider', async () => {
    await agreement();
    const other = await prisma.user.create({
      data: {
        email: randomUUID() + '@example.test',
        passwordHash: 'unused',
        firstName: 'Other',
        lastName: 'Owner',
      },
    });
    await prisma.business.update({
      where: { id: businessId },
      data: { ownerId: other.id },
    });
    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/' + businessId + '/status')
      .set('Cookie', cookies)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/' + businessId + '/cancel-renewal')
      .set('Cookie', cookies)
      .set('Origin', origin)
      .expect(403);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not let a paid renewal reactivate a suspended business', async () => {
    const data = await agreement();
    const r = renewal(data);
    await prisma.subscription.update({
      where: { id: subId },
      data: { status: 'SUSPENDED' },
    });
    await sendEvent('invoice.update', r.invoice);
    await service.recoverPendingEvents();
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subId } }))
        .status,
    ).toBe('SUSPENDED');
    expect(await repo.findPayment(r.charge.reference)).toBeNull();
  });

  it('ignores a fetched provider snapshot older than the saved renewal state', async () => {
    const data = await agreement();
    const stale = structuredClone(data);
    data.status = 'non-renewing';
    data.updatedAt = new Date(Date.now() + 1000).toISOString();
    await sendEvent('subscription.not_renew', {
      subscription_code: data.subscription_code,
    });
    await service.recoverPendingEvents();
    const linked = await repo.findLinked(data.subscription_code);
    await repo.linkAndSync(linked!.billingAnchorPayment!, stale);
    expect((await repo.findLinked(data.subscription_code))!.renewalStatus).toBe(
      'non-renewing',
    );
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
    expect(await repo.hasReviewEvents()).toBe(true);
    // A later process/run must still fail even though REVIEW is not a due event.
    await expect(service.recoverPendingEvents(true))
      .rejects.toThrow('Billing recovery failed');
    expect(await prisma.paymentEvent.findUniqueOrThrow({ where: { id } }))
      .toEqual(event);
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
