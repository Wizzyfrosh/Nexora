import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { PaystackCharge } from './paystack.service';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

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
  ) {
    // skipDuplicates is safe under concurrent delivery; upsert read/create can race.
    await this.prisma.paymentEvent.createMany({
      data: [{ id, event, reference, providerObjectId }],
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
}
