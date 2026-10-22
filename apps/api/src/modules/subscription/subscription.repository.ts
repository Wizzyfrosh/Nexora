import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, SubscriptionPlan, Payment } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PaystackCharge, PaystackSubscription } from './paystack.service';
import {
  InvoiceEvidence,
  checkProviderSubscription,
  checkInvoice,
  requireBilling,
} from './billing-policy';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  billingHistory(businessId: string) {
    return this.prisma.payment.findMany({
      where: { subscription: { businessId, deletedAt: null }, deletedAt: null },
      select: {
        paystackReference: true, paystackStatus: true, amountNgn: true,
        currency: true, purchasedPlan: true, paidAt: true,
        coverageStart: true, coverageEnd: true, createdAt: true, fulfilledAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  findByBusinessId(businessId: string) {
    return this.prisma.subscription.findUnique({ where: { businessId } });
  }

  findPlanByName(name: SubscriptionPlan) {
    return this.prisma.plan.findUnique({ where: { name } });
  }

  findPayment(reference: string) {
    return this.prisma.payment.findUnique({
      where: { paystackReference: reference },
      include: { subscription: { include: { business: true } } },
    });
  }

  createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data });
      await tx.paymentEvent.create({
        data: {
          id: 'reconcile:' + payment.paystackReference,
          event: 'charge.success',
          reference: payment.paystackReference,
          nextAttemptAt: new Date(Date.now() + 30000),
        },
      });
      return payment;
    });
  }

  async fulfill(reference: string, charge: PaystackCharge) {
    return this.prisma.$transaction(async (tx) => {
      const initial = await tx.payment.findUnique({
        where: { paystackReference: reference },
      });
      if (!initial) throw new NotFoundException('Payment not found');
      // Serialize different purchases as well as duplicate deliveries for one subscription.
      const sub = await tx.subscription.update({
        where: {
          id: initial.subscriptionId,
          deletedAt: null,
          business: { deletedAt: null },
        },
        data: { updatedAt: new Date() },
      });
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: initial.id },
      });
      if (payment.fulfilledAt) return;
      if (
        sub.status === 'SUSPENDED' ||
        payment.deletedAt ||
        !payment.purchasedPlan ||
        !payment.expectedAmountKobo ||
        payment.expectedAmountKobo !== charge.amount ||
        payment.currency !== charge.currency ||
        payment.paystackReference !== charge.reference ||
        charge.status !== 'success'
      ) {
        throw new BadRequestException('Payment requires review');
      }
      if (
        sub.status === 'ACTIVE' &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd > new Date() &&
        sub.plan !== payment.purchasedPlan
      ) {
        throw new BadRequestException('Active plan changes require review');
      }
      const paidAt = new Date(charge.paid_at);
      const start =
        sub.plan === payment.purchasedPlan &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd > paidAt
          ? sub.currentPeriodEnd
          : paidAt;
      const end = new Date(start);
      // Clamp leap-day anniversaries to February's last day.
      const month = end.getUTCMonth();
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      if (end.getUTCMonth() !== month) end.setUTCDate(0);
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paystackStatus: 'SUCCESS',
          paidAt,
          fulfilledAt: new Date(),
          providerTransactionId: String(charge.id),
          coverageStart: start,
          coverageEnd: end,
        },
      });
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          plan: payment.purchasedPlan,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          paystackCustomerId: charge.customer.customer_code,
          // authorization_code is deliberately never stored as subscription_code.
        },
      });
    });
  }

  expire(now: Date) {
    // Evaluate expiry in the write itself, so a concurrently renewed term is preserved.
    return this.prisma.subscription.updateMany({
      where: {
        deletedAt: null,
        OR: [
          { status: 'TRIAL', trialEndDate: { lte: now } },
          { status: 'ACTIVE', currentPeriodEnd: { lte: now } },
        ],
      },
      data: { status: 'EXPIRED' },
    });
  }

  async receiveEvent(
    id: string,
    event: string,
    reference: string | null,
    providerObjectId: string | null = null,
    billingData: Prisma.InputJsonObject = {},
  ) {
    // skipDuplicates is safe under concurrent delivery; upsert read/create can race.
    await this.prisma.paymentEvent.createMany({
      data: [{ id, event, reference, providerObjectId, billingData }],
      skipDuplicates: true,
    });
  }

  dueEvents(now: Date) {
    return this.prisma.paymentEvent.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: 'asc' },
      take: 10,
    });
  }

  async hasReviewEvents(): Promise<boolean> {
    // A bounded existence query keeps unresolved incidents visible across runs.
    return (await this.prisma.paymentEvent.findFirst({
      where: { status: 'REVIEW' },
      select: { id: true },
    })) !== null;
  }

  claimEvent(id: string, now: Date) {
    return this.prisma.paymentEvent.updateMany({
      where: { id, status: 'PENDING', nextAttemptAt: { lte: now } },
      data: {
        attempts: { increment: 1 },
        nextAttemptAt: new Date(now.getTime() + 120000),
      },
    });
  }

  finishEvent(id: string, status: 'DONE' | 'REVIEW') {
    return this.prisma.paymentEvent.update({
      where: { id },
      data: { status, processedAt: new Date() },
    });
  }

  retryEvent(id: string, attempts: number) {
    return this.prisma.paymentEvent.update({
      where: { id, status: 'PENDING' },
      data:
        attempts >= 8
          ? { status: 'REVIEW' }
          : {
              nextAttemptAt: new Date(
                Date.now() + Math.min(3600000, 30000 * 2 ** attempts),
              ),
            },
    });
  }

  findLinked(code: string) {
    return this.prisma.subscription.findUnique({
      where: { paystackSubscriptionId: code },
      include: { billingAnchorPayment: true },
    });
  }

  findPaymentByTransaction(id: string) {
    return this.prisma.payment.findUnique({
      where: { providerTransactionId: id },
    });
  }

  async linkAndSync(
    anchor: Payment,
    provider: PaystackSubscription,
    expectedDomain: 'test' | 'live' = 'test',
  ) {
    checkProviderSubscription(provider, anchor, provider.subscription_code, expectedDomain);
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: {
          id: anchor.subscriptionId,
          deletedAt: null,
          business: { deletedAt: null },
        },
        data: { updatedAt: new Date() },
      });
      const saved = await tx.payment.findUniqueOrThrow({
        where: { id: anchor.id },
      });
      checkProviderSubscription(provider, saved, provider.subscription_code, expectedDomain);
      requireBilling(
        (!sub.paystackSubscriptionId ||
          sub.paystackSubscriptionId === provider.subscription_code) &&
          (!sub.billingAnchorPaymentId ||
            sub.billingAnchorPaymentId === anchor.id) &&
          sub.plan === saved.purchasedPlan &&
          sub.paystackCustomerId === provider.customer.customer_code,
        'LINK_CONFLICT',
      );
      const updated = new Date(provider.updatedAt);
      if (sub.providerStatusUpdatedAt && sub.providerStatusUpdatedAt > updated)
        return sub;
      if (sub.providerStatusUpdatedAt?.getTime() === updated.getTime()) {
        requireBilling(
          sub.renewalStatus === provider.status ||
            sub.renewalStatus === 'CANCEL_REQUESTED',
          'LINK_STATUS_CONFLICT',
        );
      }
      return tx.subscription.update({
        where: { id: sub.id },
        data: {
          paystackSubscriptionId: provider.subscription_code,
          billingAnchorPaymentId: anchor.id,
          renewalStatus:
            sub.cancelRequestedAt && provider.status === 'active'
              ? 'CANCEL_REQUESTED'
              : provider.status,
          providerStatusUpdatedAt: updated,
          cancelRequestedAt: [
            'non-renewing',
            'cancelled',
            'completed',
          ].includes(provider.status)
            ? null
            : sub.cancelRequestedAt,
          nextProviderSyncAt: new Date(Date.now() + 15 * 60000),
        },
      });
    });
  }

  async fulfillInvoice(
    anchor: Payment,
    charge: PaystackCharge,
    invoice: InvoiceEvidence,
    customerCode: string,
  ) {
    const dates = checkInvoice(invoice, charge, anchor, customerCode);
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: {
          id: anchor.subscriptionId,
          deletedAt: null,
          business: { deletedAt: null },
        },
        data: { updatedAt: new Date() },
      });
      requireBilling(
        sub.billingAnchorPaymentId === anchor.id &&
          sub.paystackSubscriptionId === invoice.subscriptionCode &&
          sub.paystackCustomerId === customerCode &&
          sub.status !== 'SUSPENDED' &&
          sub.plan === anchor.purchasedPlan &&
          (!charge.metadata?.businessId ||
            charge.metadata.businessId === sub.businessId) &&
          (!charge.metadata?.planName ||
            charge.metadata.planName === anchor.purchasedPlan),
      );
      const existing = await tx.payment.findUnique({
        where: { paystackReference: charge.reference },
      });
      if (existing) {
        requireBilling(
          existing.subscriptionId === sub.id &&
            existing.fulfilledAt &&
            existing.providerTransactionId === String(charge.id),
        );
        requireBilling(
          !existing.providerInvoiceCode ||
            existing.providerInvoiceCode === invoice.invoiceCode,
        );
        if (!existing.providerInvoiceCode)
          await tx.payment.update({
            where: { id: existing.id },
            data: { providerInvoiceCode: invoice.invoiceCode },
          });
        return; // Includes the initial invoice: never grant the first payment twice.
      }
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          paystackReference: charge.reference,
          paystackStatus: 'SUCCESS',
          amountNgn: anchor.amountNgn,
          expectedAmountKobo: anchor.expectedAmountKobo,
          currency: anchor.currency,
          expectedEmail: anchor.expectedEmail,
          purchasedPlan: anchor.purchasedPlan,
          billingCycle: anchor.billingCycle,
          providerPlanCode: anchor.providerPlanCode,
          providerTransactionId: String(charge.id),
          providerInvoiceCode: invoice.invoiceCode,
          paidAt: dates.paid,
          fulfilledAt: new Date(),
          coverageStart: dates.start,
          coverageEnd: dates.end,
        },
      });
      // Absolute invoice periods make old delivery/order irrelevant; never append a year on replay.
      if (!sub.currentPeriodEnd || dates.end > sub.currentPeriodEnd) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: dates.end > new Date() ? 'ACTIVE' : 'EXPIRED',
            currentPeriodStart: dates.start,
            currentPeriodEnd: dates.end,
          },
        });
      }
    });
  }

  async enqueueProviderSyncs(now: Date) {
    const due = await this.prisma.subscription.findMany({
      where: {
        deletedAt: null,
        paystackSubscriptionId: { not: null },
        nextProviderSyncAt: { lte: now },
      },
      take: 10,
      orderBy: { nextProviderSyncAt: 'asc' },
    });
    for (const sub of due)
      await this.prisma.$transaction(async (tx) => {
        const claim = await tx.subscription.updateMany({
          where: { id: sub.id, nextProviderSyncAt: { lte: now } },
          data: { nextProviderSyncAt: new Date(now.getTime() + 15 * 60000) },
        });
        if (claim.count)
          await tx.paymentEvent.create({
            data: {
              id: 'sync:' + randomUUID(),
              event: 'subscription.sync',
              providerObjectId: sub.paystackSubscriptionId,
            },
          });
      });
  }

  async requestCancellation(userId: string, businessId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findFirst({
        where: {
          businessId,
          deletedAt: null,
          business: { ownerId: userId, deletedAt: null },
        },
      });
      if (!sub) throw new NotFoundException('Subscription not found');
      if (!sub.paystackSubscriptionId || !sub.billingAnchorPaymentId)
        throw new BadRequestException('Subscription mapping requires review');
      const locked = await tx.subscription.update({
        where: {
          id: sub.id,
          deletedAt: null,
          business: { ownerId: userId, deletedAt: null },
        },
        data: { updatedAt: new Date() },
      });
      if (locked.cancelRequestedAt) {
        const event = await tx.paymentEvent.findFirst({
          where: {
            event: 'subscription.cancel',
            providerObjectId: locked.paystackSubscriptionId,
          },
          orderBy: { createdAt: 'desc' },
        });
        requireBilling(event);
        return { status: event.status };
      }
      const id = 'cancel:' + randomUUID();
      await tx.paymentEvent.create({
        data: {
          id,
          event: 'subscription.cancel',
          providerObjectId: sub.paystackSubscriptionId,
        },
      });
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          cancelRequestedAt: new Date(),
          renewalStatus: 'CANCEL_REQUESTED',
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_CANCEL_REQUESTED',
          entity: 'Subscription',
          entityId: sub.id,
        },
      });
      return { status: 'PENDING' };
    });
  }
}
