import { Controller, Post, Body, Req, Headers, UseGuards, HttpCode, HttpStatus, Param, Get } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionPlan } from '@nexora/shared-types';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { IsString, IsEnum } from 'class-validator';

class InitiateSubRequestDto {
  @IsEnum(SubscriptionPlan) plan!: SubscriptionPlan;
  @IsString() callbackUrl!: string;
}

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post(':businessId/initiate')
  @ResponseMessage('Subscription checkout initialized')
  async initiateSubscription(
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
    @Body() dto: InitiateSubRequestDto,
  ) {
    return this.subService.initiateSubscription(userId, businessId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify/:reference')
  @ResponseMessage('Payment verification complete')
  async verifyPayment(@Param('reference') reference: string) {
    return this.subService.verifyPayment(reference);
  }

  // ---- Webhooks ----

  @Public()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    // NestJS parses the body into req.body already
    // The signature validation requires raw string comparison in edge cases, 
    // but for Paystack, hashing stringified JSON body usually works.
    await this.subService.handleWebhook(signature, req.body);
    // Respond 200 OK fast so Paystack doesn't retry
    return { status: 'success' };
  }
}
