import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Get,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionPlan } from '@nexora/shared-types';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { IsString, IsIn, MaxLength } from 'class-validator';

class InitiateSubRequestDto {
  @IsIn([SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM])
  plan!: SubscriptionPlan;
  @IsString() @MaxLength(2048) callbackUrl!: string;
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
  async verifyPayment(
    @CurrentUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.subService.verifyPayment(userId, reference);
  }

  // ---- Webhooks ----

  @Public()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.subService.handleWebhook(signature, req.rawBody);
    return { status: 'success' };
  }
}
