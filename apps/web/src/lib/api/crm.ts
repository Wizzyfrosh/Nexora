// ============================================================
// Nexora Web — CRM API Client
// Typed methods for managing leads and CRM resources
// ============================================================

import { apiFetch } from './client';
import { 
  CreateLeadDto, 
  ILead,
  ILeadStats
} from '@nexora/shared-types';

export interface PaginatedLeads {
  data: ILead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CrmApiService {
  /**
   * Get paginated leads for a business with optional search.
   */
  static async getLeads(
    businessId: string, 
    page: number = 1, 
    limit: number = 20,
    search?: string
  ): Promise<PaginatedLeads> {
    let url = `/businesses/${businessId}/crm/leads?page=${page}&limit=${limit}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return apiFetch<PaginatedLeads>(url);
  }

  /**
   * Get lead statistics (total, unread, this week).
   */
  static async getLeadStats(businessId: string): Promise<ILeadStats> {
    return apiFetch<ILeadStats>(`/businesses/${businessId}/crm/leads/stats`);
  }

  /**
   * Mark a lead as read.
   */
  static async markAsRead(businessId: string, leadId: string): Promise<ILead> {
    return apiFetch<ILead>(`/businesses/${businessId}/crm/leads/${leadId}/read`, {
      method: 'PUT',
    });
  }

  /**
   * Delete a lead.
   */
  static async deleteLead(businessId: string, leadId: string): Promise<void> {
    await apiFetch(`/businesses/${businessId}/crm/leads/${leadId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Submit a contact form / capture a lead (public storefront).
   */
  static async submitContactForm(businessId: string, dto: CreateLeadDto): Promise<ILead> {
    return apiFetch<ILead>(`/businesses/${businessId}/crm/leads`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
