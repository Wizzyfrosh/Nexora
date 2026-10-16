import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';
import { BillingLifecycleService } from './billing-lifecycle.service';

@Module({
  imports: [AuthModule, BusinessModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    PaystackService,
    BillingLifecycleService,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
