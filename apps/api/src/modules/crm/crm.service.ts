import { assertPagination } from '../../common/security/pagination';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRepository } from './crm.repository';
import { CreateLeadDto } from '@nexora/shared-types';

@Injectable()
export class CrmService {
  constructor(private readonly crmRepo: CrmRepository) {}

  async captureLead(businessId: string, dto: CreateLeadDto) {
    // In a real production system, you might trigger an email/SMS notification here to the business owner
    const lead = await this.crmRepo.createLead(businessId, dto);
    return { id: lead.id };
  }

  async getLeads(
    businessId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    assertPagination(page, limit);
    return this.crmRepo.getLeads(businessId, page, limit, search);
  }

  async getUnreadCount(businessId: string) {
    return this.crmRepo.getUnreadCount(businessId);
  }

  async getLeadStats(businessId: string) {
    return this.crmRepo.getLeadStats(businessId);
  }

  async markLeadAsRead(businessId: string, leadId: string) {
    return this.crmRepo.markAsRead(leadId, businessId);
  }

  async deleteLead(businessId: string, leadId: string) {
    return this.crmRepo.deleteLead(leadId, businessId);
  }

  async logWhatsAppClick(
    businessId: string,
    sessionId: string,
    pageSource: string,
  ) {
    await this.crmRepo.trackAnalyticsEvent(
      businessId,
      'WHATSAPP_CLICK',
      { source: pageSource },
      sessionId,
    );
    return { recorded: true };
  }
}
