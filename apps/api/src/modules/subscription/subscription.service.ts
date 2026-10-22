import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { SubscriptionPlan } from '@nexora/shared-types';
import { AuthRepository } from '../auth/auth.repository';
import { BusinessService } from '../business/business.service';
import {
  BillingLifecycleService,
  BillingRecoveryError,
} from './billing-lifecycle.service';
import { validTransactionId } from './billing-policy';

@Injectable()
export class SubscriptionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly subRepo: SubscriptionRepository,
    private readonly paystackService: PaystackService,
    private readonly authRepo: AuthRepository,
    private readonly businessService: BusinessService,
    private readonly config: ConfigService,
    private readonly lifecycle: BillingLifecycleService,
  ) {}

  onModuleInit() {
    // An external cron worker can own reconciliation without an always-on web timer.
    if (this.config.get<string>('billing.workerMode') === 'scheduled') return;
    this.timer = setInterval(() => void this.recoverPendingEvents(), 15000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkExpiredSubscriptions() {
    await this.subRepo.expire(new Date());
  }

  async initiateSubscription(
    userId: string,
    businessId: string,
    dto: { plan: SubscriptionPlan; callbackUrl: string },
  ) {
    const business = await this.businessService.getBusinessProfile(businessId);
    if (!business || business.ownerId !== userId || business.deletedAt)
      throw new NotFoundException('Business not found');
    if (![SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM].includes(dto.plan))
      throw new BadRequestException('Unsupported plan');
    // The frontend cannot be the sole enforcement of unreleased plan sales.
    if (dto.plan === SubscriptionPlan.PREMIUM)
      throw new ServiceUnavailableException('Premium checkout is not released');
    const user = await this.authRepo.findUserById(userId);
    const sub = await this.subRepo.findByBusinessId(businessId);
    if (!user || !sub || sub.deletedAt)
      throw new NotFoundException('Subscription not found');
    if (sub.status === 'SUSPENDED')
      throw new BadRequestException('Subscription requires review');
    if (sub.paystackSubscriptionId)
      throw new BadRequestException(
        'Manage the existing recurring subscription before opening another checkout',
      );
    if (
      sub.status === 'ACTIVE' &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd > new Date() &&
      sub.plan !== String(dto.plan)
    ) {
      throw new BadRequestException('Active plan changes require review');
    }
    const plan = await this.subRepo.findPlanByName(dto.plan);
    if (
      !plan ||
      plan.deletedAt ||
      !plan.paystackPlanCode ||
      plan.billingCycle !== 'yearly' ||
      !Number.isSafeInteger(plan.priceNgn * 100) ||
      plan.priceNgn <= 0 ||
      plan.priceNgn * 100 > 2147483647
    ) {
      throw new BadRequestException('Annual plan not configured');
    }
    let callback: URL;
    try {
      callback = new URL(dto.callbackUrl);
    } catch {
      throw new BadRequestException('Invalid callback URL');
    }
    const frontend = new URL(
      this.config.get<string>('frontendUrl') || 'http://localhost:3000',
    );
    if (
      callback.origin !== frontend.origin ||
      callback.username ||
      callback.password ||
      callback.hash
    ) {
      throw new BadRequestException('Invalid callback URL');
    }
    this.paystackService.assertCheckoutEnabled();
    const reference = 'nexora-' + randomUUID();
    // Snapshot before contacting provider. A timeout can still leave a recoverable charge.
    await this.subRepo.createPayment({
      subscriptionId: sub.id,
      amountNgn: plan.priceNgn,
      currency: 'NGN',
      expectedAmountKobo: plan.priceNgn * 100,
      expectedEmail: user.email.trim().toLowerCase(),
      purchasedPlan: plan.name,
      billingCycle: plan.billingCycle,
      providerPlanCode: plan.paystackPlanCode,
      paystackReference: reference,
      paystackStatus: 'PENDING',
    });
    const result = await this.paystackService.initializeTransaction(
      user.email,
      plan.priceNgn * 100,
      plan.paystackPlanCode,
      callback.href,
      reference,
      { businessId, planName: plan.name },
    );
    return { authorizationUrl: result.data.authorization_url, reference };
  }

  async verifyPayment(userId: string, reference: string) {
    const payment = await this.subRepo.findPayment(reference);
    if (
      !payment ||
      payment.deletedAt ||
      payment.subscription.deletedAt ||
      payment.subscription.business.deletedAt ||
      payment.subscription.business.ownerId !== userId
    ) {
      throw new NotFoundException('Payment not found');
    }
    await this.verifyKnownPayment(reference);
    return { success: true, message: 'Payment verified successfully' };
  }

  private async verifyKnownPayment(reference: string) {
    const payment = await this.subRepo.findPayment(reference);
    if (
      !payment ||
      payment.deletedAt ||
      payment.subscription.deletedAt ||
      payment.subscription.business.deletedAt
    ) {
      throw new BadRequestException('Unknown payment requires review');
    }
    if (payment.fulfilledAt) return;
    const { data } = await this.paystackService.verifyTransaction(reference);
    const paidAt = new Date(data.paid_at);
    if (
      data.status !== 'success' ||
      data.reference !== reference ||
      data.currency !== payment.currency ||
      !payment.expectedAmountKobo ||
      data.amount !== payment.expectedAmountKobo ||
      !payment.expectedEmail ||
      data.customer?.email?.trim().toLowerCase() !== payment.expectedEmail ||
      !data.customer?.customer_code ||
      !payment.purchasedPlan ||
      payment.billingCycle !== 'yearly' ||
      !validTransactionId(data.id) ||
      !Number.isFinite(paidAt.getTime()) ||
      paidAt.getTime() > Date.now() + 300000 ||
      paidAt.getTime() < payment.createdAt.getTime() - 300000 ||
      data.metadata?.businessId !== payment.subscription.businessId ||
      data.metadata?.planName !== payment.purchasedPlan
    ) {
      throw new BadRequestException(
        'Payment not successful or details do not match purchase',
      );
    }
    await this.subRepo.fulfill(reference, data);
  }

  async handleWebhook(signature: string | undefined, raw: Buffer | undefined) {
    if (!this.paystackService.validateWebhookSignature(signature, raw))
      throw new BadRequestException('Invalid signature');
    const object = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    let payload: Record<string, unknown>;
    try {
      const decoded: unknown = JSON.parse(raw!.toString('utf8'));
      payload = object(decoded);
    } catch {
      throw new BadRequestException('Invalid event');
    }
    if (
      !payload ||
      typeof payload.event !== 'string' ||
      payload.event.length > 100
    )
      throw new BadRequestException('Invalid event');
    const field = (value: unknown): string | null =>
      typeof value === 'string' && value.length <= 200 ? value : null;
    const data = object(payload.data);
    const transaction = object(data.transaction);
    const subscription = object(data.subscription);
    const customer = object(data.customer);
    const reference = field(data.reference) || field(transaction.reference);
    // Durable minimal receipt only. Never keep card authorization in event storage.
    const objectId =
      data.subscription_code ?? subscription.subscription_code ?? data.id;
    const providerObjectId =
      (typeof objectId === 'string' || typeof objectId === 'number') &&
      String(objectId).length <= 200
        ? String(objectId)
        : null;
    await this.subRepo.receiveEvent(
      createHash('sha256').update(raw!).digest('hex'),
      payload.event,
      reference,
      providerObjectId,
      payload.event.startsWith('invoice.')
        ? {
            subscriptionCode: field(subscription.subscription_code),
            invoiceCode: field(data?.invoice_code),
            reference,
            amount: typeof data?.amount === 'number' ? data.amount : null,
            currency: field(transaction.currency),
            customerCode: field(customer.customer_code),
            periodStart: field(data?.period_start),
            periodEnd: field(data?.period_end),
            paid: data?.paid === true || data?.paid === 1,
          }
        : {},
    );
  }

  async recoverPendingEvents(strict = false) {
    if (this.running) {
      if (strict) throw new Error('Billing worker already running');
      return;
    }
    this.running = true;
    let deferred = 0;
    let review = 0;
    try {
      await this.checkExpiredSubscriptions();
      await this.subRepo.enqueueProviderSyncs(new Date());
      for (const event of await this.subRepo.dueEvents(new Date())) {
        if (!(await this.subRepo.claimEvent(event.id, new Date())).count)
          continue;
        try {
          if (event.event !== 'charge.success' || !event.reference) {
            const handled = await this.lifecycle.process(event, (reference) =>
              this.verifyKnownPayment(reference),
            );
            await this.subRepo.finishEvent(
              event.id,
              handled ? 'DONE' : 'REVIEW',
            );
            if (!handled) review++;
            continue;
          }
          await this.verifyKnownPayment(event.reference);
          await this.subRepo.finishEvent(event.id, 'DONE');
        } catch (error) {
          deferred++;
          await this.subRepo.retryEvent(event.id, event.attempts + 1);
          this.logger.warn(
            'Payment event deferred at ' +
              (error instanceof BillingRecoveryError
                ? error.stage + '/' + error.reason
                : 'INITIAL_VERIFICATION_OR_INTERNAL') +
              '; inspect pending/review inbox',
          );
        }
      }
      // A previous invocation may already have quarantined an event. Keep cron
      // failure notifications active until an operator resolves that incident.
      if (
        strict &&
        (deferred || review || (await this.subRepo.hasReviewEvents()))
      )
        throw new Error('Billing recovery requires operator attention');
    } catch {
      this.logger.error(
        'Billing recovery unavailable or requires review; durable records retained',
      );
      if (strict)
        throw new Error(
          'Billing recovery failed; inspect protected event queue',
        );
    } finally {
      this.running = false;
    }
  }

  async billingHistory(userId: string, businessId: string) {
    const business = await this.businessService.getBusinessProfile(businessId);
    if (!business || business.ownerId !== userId || business.deletedAt)
      throw new NotFoundException('Business not found');
    const records = await this.subRepo.billingHistory(businessId);
    // Owner-only, bounded projection: no provider tokens, raw metadata or card data.
    return records.map((payment) => ({
      reference: payment.paystackReference,
      status: payment.paystackStatus,
      amountNgn: payment.amountNgn,
      currency: payment.currency,
      plan: payment.purchasedPlan,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      coverageStart: payment.coverageStart?.toISOString() ?? null,
      coverageEnd: payment.coverageEnd?.toISOString() ?? null,
      verified: Boolean(payment.fulfilledAt),
    }));
  }

  async billingStatus(userId: string, businessId: string) {
    const business = await this.businessService.getBusinessProfile(businessId);
    if (!business || business.ownerId !== userId || business.deletedAt)
      throw new NotFoundException('Business not found');
    const sub = await this.subRepo.findByBusinessId(businessId);
    if (!sub || sub.deletedAt)
      throw new NotFoundException('Subscription not found');
    return {
      plan: sub.plan,
      status: sub.status,
      renewalStatus: sub.renewalStatus,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      linked: Boolean(sub.paystackSubscriptionId && sub.billingAnchorPaymentId),
      cancelRequested: Boolean(sub.cancelRequestedAt),
    };
  }

  async cancelRenewal(userId: string, businessId: string) {
    // Customers must be able to stop renewal even when new checkout is closed.
    return this.subRepo.requestCancellation(userId, businessId);
  }
}
