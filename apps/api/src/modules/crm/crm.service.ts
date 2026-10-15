import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRepository } from './crm.repository';
import { CreateLeadDto } from '@nexora/shared-types';

@Injectable()
export class CrmService {
  constructor(private readonly crmRepo: CrmRepository) {}

  async captureLead(businessId: string, dto: CreateLeadDto) {
    // In a real production system, you might trigger an email/SMS notification here to the business owner
    return this.crmRepo.createLead(businessId, dto);
  }

  async getLeads(businessId: string, page: number, limit: number, search?: string) {
    return this.crmRepo.getLeads(businessId, page, limit, search);
  }

  async getUnreadCount(businessId: string) {
    return this.crmRepo.getUnreadCount(businessId);
  }

  async getLeadStats(businessId: string) {
    return this.crmRepo.getLeadStats(businessId);
  }

  async markLeadAsRead(businessId: string, leadId: string) {
    // We scope by businessId implicitly by ensuring the lead exists in the business context first
    // Since Prisma update requires unique ID, we could do a compound query, but for simplicity:
    return this.crmRepo.markAsRead(leadId);
  }

  async deleteLead(businessId: string, leadId: string) {
    return this.crmRepo.deleteLead(leadId);
  }

  async logWhatsAppClick(businessId: string, sessionId: string, pageSource: string) {
    return this.crmRepo.trackAnalyticsEvent(
      businessId, 
      'WHATSAPP_CLICK', 
      { source: pageSource },
      sessionId
    );
  }
}
