import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionRepository {
  private readonly logger = new Logger(SubscriptionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string) {
    return this.prisma.subscription.findUnique({
      where: { businessId },
    });
  }

  async findByPaystackSubscriptionId(paystackSubscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { paystackSubscriptionId },
      include: { business: true },
    });
  }

  async findPlanByName(planName: SubscriptionPlan) {
    return this.prisma.plan.findUnique({
      where: { name: planName },
    });
  }

  async updateSubscriptionStatus(
    businessId: string, 
    data: {
      status?: SubscriptionStatus;
      plan?: SubscriptionPlan;
      paystackSubscriptionId?: string;
      paystackCustomerId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    }
  ) {
    return this.prisma.subscription.update({
      where: { businessId },
      data,
    });
  }

  async findExpiredSubscriptions(status: SubscriptionStatus, now: Date) {
    if (status === 'TRIAL') {
      return this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndDate: { lt: now },
        },
      });
    } else {
      return this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lt: now },
        },
      });
    }
  }

  async createPaymentRecord(data: {
    subscriptionId: string;
    amountNgn: number;
    paystackReference: string;
    paystackStatus: string;
    paidAt?: Date;
    metadata?: any;
  }) {
    return this.prisma.payment.create({
      data,
    });
  }

  async updatePaymentRecord(paystackReference: string, data: {
    paystackStatus: string;
    paidAt?: Date;
  }) {
    return this.prisma.payment.update({
      where: { paystackReference },
      data,
    });
  }
}
