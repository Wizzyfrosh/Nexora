import {
  CreateLeadRequest,
  TrackClickRequest,
} from '../../common/dto/content.dto';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Ip,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { PublicBusinessGuard } from '../../common/guards/public-business.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('businesses/:businessId/crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ---- Public Storefront Routes ----

  @Public()
  @UseGuards(PublicBusinessGuard)
  @Post('leads')
  @ResponseMessage('Message sent successfully')
  async submitContactForm(
    @Param('businessId') businessId: string,
    @Body() dto: CreateLeadRequest,
  ) {
    return this.crmService.captureLead(businessId, dto);
  }

  @Public()
  @UseGuards(PublicBusinessGuard)
  @Post('track/whatsapp')
  @ResponseMessage('Click tracked')
  async trackWhatsAppClick(
    @Param('businessId') businessId: string,
    @Body() data: TrackClickRequest,
    @Ip() ip: string, // Simple sessionId proxy for unauthenticated storefront users
  ) {
    // Note: In real production, pass a proper sessionId from frontend cookies
    return this.crmService.logWhatsAppClick(
      businessId,
      ip || 'unknown',
      data.source || 'direct',
    );
  }

  // ---- Tenant Dashboard Routes ----

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('leads')
  @ResponseMessage('Leads retrieved')
  async getLeads(
    @Param('businessId') businessId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.crmService.getLeads(businessId, page, limit, search);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('leads/stats')
  @ResponseMessage('Lead stats retrieved')
  async getLeadStats(@Param('businessId') businessId: string) {
    return this.crmService.getLeadStats(businessId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('leads/unread-count')
  @ResponseMessage('Unread count retrieved')
  async getUnreadCount(@Param('businessId') businessId: string) {
    const count = await this.crmService.getUnreadCount(businessId);
    return { count };
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put('leads/:leadId/read')
  @ResponseMessage('Lead marked as read')
  async markAsRead(
    @Param('businessId') businessId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.crmService.markLeadAsRead(businessId, leadId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Delete('leads/:leadId')
  @ResponseMessage('Lead deleted')
  async deleteLead(
    @Param('businessId') businessId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.crmService.deleteLead(businessId, leadId);
  }
}
