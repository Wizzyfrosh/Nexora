import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { SubscriptionPlan } from '@nexora/shared-types';
import { SubscriptionPlan as PrismaSubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { AuthRepository } from '../auth/auth.repository';
import { BusinessService } from '../business/business.service';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly subRepo: SubscriptionRepository,
    private readonly paystackService: PaystackService,
    private readonly authRepo: AuthRepository,
    private readonly businessService: BusinessService,
  ) {}

  onModuleInit() {
    // Check for expired subscriptions 10 seconds after startup
    setTimeout(() => this.checkExpiredSubscriptions(), 10000);
    // Run the check daily (every 24 hours)
    setInterval(() => this.checkExpiredSubscriptions(), 24 * 60 * 60 * 1000);
  }

  async checkExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions and trials...');
    const now = new Date();

    try {
      // 1. Find and expire TRIAL subscriptions whose trialEndDate has passed
      const expiredTrials = await this.subRepo.findExpiredSubscriptions(SubscriptionStatus.TRIAL, now);
      for (const sub of expiredTrials) {
        await this.subRepo.updateSubscriptionStatus(sub.businessId, {
          status: SubscriptionStatus.EXPIRED,
        });
        this.logger.log(`Trial expired for business ID: ${sub.businessId}`);
      }

      // 2. Find and expire ACTIVE subscriptions whose currentPeriodEnd has passed
      const expiredActive = await this.subRepo.findExpiredSubscriptions(SubscriptionStatus.ACTIVE, now);
      for (const sub of expiredActive) {
        await this.subRepo.updateSubscriptionStatus(sub.businessId, {
          status: SubscriptionStatus.EXPIRED,
        });
        this.logger.log(`Active subscription expired for business ID: ${sub.businessId}`);
      }
    } catch (error) {
      this.logger.error(`Error checking expired subscriptions: ${error.message}`);
    }
  }

  /**
   * Initiates a subscription process with Paystack
   */
  async initiateSubscription(userId: string, businessId: string, dto: { plan: SubscriptionPlan; callbackUrl: string }) {
    // 1. Validate Business and User
    const business = await this.businessService.getBusinessProfile(businessId);
    if (!business || business.ownerId !== userId) {
      throw new NotFoundException('Business not found or unauthorized');
    }

    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Fetch Plan Details
    const plan = await this.subRepo.findPlanByName(dto.plan as PrismaSubscriptionPlan);
    if (!plan) {
      // Auto-seed plans if missing for development ergonomics
      throw new BadRequestException(`Plan ${dto.plan} not configured in database`);
    }

    if (!plan.paystackPlanCode) {
      throw new BadRequestException(`Plan ${dto.plan} is missing Paystack integration code`);
    }

    // 3. Initiate Paystack Transaction
    const amountKobo = plan.priceNgn * 100;
    
    const initResponse = await this.paystackService.initializeTransaction(
      user.email,
      amountKobo,
      plan.paystackPlanCode,
      dto.callbackUrl,
      {
        businessId,
        planName: plan.name,
      }
    );

    // 4. Create Pending Payment Record
    const subscription = await this.subRepo.findByBusinessId(businessId);
    if (!subscription) {
      throw new NotFoundException('Subscription record missing for business');
    }

    await this.subRepo.createPaymentRecord({
      subscriptionId: subscription.id,
      amountNgn: plan.priceNgn,
      paystackReference: initResponse.data.reference,
      paystackStatus: 'PENDING',
      metadata: { plan: plan.name }
    });

    return {
      authorizationUrl: initResponse.data.authorization_url,
      reference: initResponse.data.reference,
    };
  }

  /**
   * Manually verify a transaction via reference (usually after redirect)
   */
  async verifyPayment(reference: string) {
    const result = await this.paystackService.verifyTransaction(reference);
    
    if (result.data.status === 'success') {
      const metadata = result.data.metadata as any;
      const businessId = metadata?.businessId;
      const planName = metadata?.planName as PrismaSubscriptionPlan;

      if (!businessId || !planName) {
        throw new BadRequestException('Invalid payment metadata');
      }

      await this.processSuccessfulPayment(businessId, planName, result.data);
      return { success: true, message: 'Payment verified successfully' };
    }

    return { success: false, message: 'Payment not successful' };
  }

  /**
   * Handle incoming Paystack Webhooks safely
   */
  async handleWebhook(signature: string, payload: any) {
    // 1. Verify Signature
    const isValid = this.paystackService.validateWebhookSignature(signature, payload);
    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = payload.event;
    const data = payload.data;

    try {
      switch (event) {
        case 'charge.success':
          await this.handleChargeSuccess(data);
          break;
        case 'subscription.create':
          await this.handleSubscriptionCreate(data);
          break;
        case 'subscription.disable':
          await this.handleSubscriptionDisable(data);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(data);
          break;
        default:
          this.logger.log(`Unhandled Paystack event: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event}: ${error.message}`);
      // Don't throw to Paystack to acknowledge receipt
    }
  }

  // ---- Private Webhook Handlers ----

  private async handleChargeSuccess(data: any) {
    const reference = data.reference;
    const metadata = data.metadata;
    
    if (metadata?.businessId && metadata?.planName) {
      await this.processSuccessfulPayment(metadata.businessId, metadata.planName, data);
    }
  }

  private async handleSubscriptionCreate(data: any) {
    // Paystack created a recurring subscription
    const subCode = data.subscription_code;
    const customerCode = data.customer.customer_code;
    
    // We need to link this subCode to our DB based on recent payment matching
    // (In production, usually metadata on initial charge handles this)
  }

  private async handleSubscriptionDisable(data: any) {
    const subCode = data.subscription_code;
    
    const sub = await this.subRepo.findByPaystackSubscriptionId(subCode);
    if (sub) {
      await this.subRepo.updateSubscriptionStatus(sub.businessId, {
        status: SubscriptionStatus.SUSPENDED
      });
      this.logger.log(`Subscription suspended for business: ${sub.businessId}`);
    }
  }

  private async handlePaymentFailed(data: any) {
    const subCode = data.subscription.subscription_code;
    
    const sub = await this.subRepo.findByPaystackSubscriptionId(subCode);
    if (sub) {
      await this.subRepo.updateSubscriptionStatus(sub.businessId, {
        status: SubscriptionStatus.PAST_DUE
      });
      this.logger.log(`Subscription past due for business: ${sub.businessId}`);
    }
  }

  private async processSuccessfulPayment(businessId: string, plan: PrismaSubscriptionPlan, data: any) {
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1); // Assuming yearly billing for now

    // 1. Update Subscription
    await this.subRepo.updateSubscriptionStatus(businessId, {
      status: SubscriptionStatus.ACTIVE,
      plan,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paystackCustomerId: data.customer?.customer_code,
      paystackSubscriptionId: data.authorization?.authorization_code, // Store auth code for future reference
    });

    // 2. Update Payment Record
    await this.subRepo.updatePaymentRecord(data.reference, {
      paystackStatus: 'SUCCESS',
      paidAt: new Date(data.paid_at || now),
    });

    this.logger.log(`Successfully processed payment for business ${businessId}, Plan: ${plan}`);
  }
}
