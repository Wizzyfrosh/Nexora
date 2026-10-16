import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Equals, IsIn, IsUUID } from 'class-validator';
import {
  type AnalyticsCapture,
  PUBLIC_ANALYTICS_EVENTS,
  type PublicAnalyticsEvent,
} from '@nexora/shared-types';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
export class AnalyticsRequest implements AnalyticsCapture {
  @IsUUID('4') eventId!: string;
  @IsIn([...PUBLIC_ANALYTICS_EVENTS]) eventType!: PublicAnalyticsEvent;
  @Transform(({ obj }: { obj: { consent: unknown } }) => obj.consent)
  @Equals(true)
  consent!: true;
}
@Controller('businesses/:businessId/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Public()
  @Post('events')
  @Header('Cache-Control', 'no-store')
  capture(@Param('businessId') id: string, @Body() input: AnalyticsRequest) {
    return this.service.capture(id, input);
  }
  @UseGuards(TenantGuard)
  @Get('report')
  @Header('Cache-Control', 'private, no-store')
  report(@Param('businessId') id: string, @Query('days') days?: string) {
    return this.service.report(id, days === undefined ? 30 : Number(days));
  }
}
