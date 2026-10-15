// ============================================================
// Nexora Web — Service API Client
// Typed methods for managing service resources
// ============================================================

import { apiFetch } from './client';
import { 
  CreateServiceDto, 
  UpdateServiceDto, 
  IService
} from '@nexora/shared-types';

export interface PaginatedServices {
  data: IService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ServiceModuleService {
  /**
   * Get all services for a business with pagination.
   */
  static async getServices(
    businessId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<PaginatedServices> {
    return apiFetch<PaginatedServices>(`/businesses/${businessId}/services?page=${page}&limit=${limit}`);
  }

  /**
   * Get a single service by ID.
   */
  static async getService(businessId: string, serviceId: string): Promise<IService> {
    return apiFetch<IService>(`/businesses/${businessId}/services/${serviceId}`);
  }

  /**
   * Create a new service.
   */
  static async createService(businessId: string, dto: CreateServiceDto): Promise<IService> {
    return apiFetch<IService>(`/businesses/${businessId}/services`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Update an existing service.
   */
  static async updateService(
    businessId: string, 
    serviceId: string, 
    dto: UpdateServiceDto
  ): Promise<IService> {
    return apiFetch<IService>(`/businesses/${businessId}/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Delete a service.
   */
  static async deleteService(businessId: string, serviceId: string): Promise<void> {
    await apiFetch(`/businesses/${businessId}/services/${serviceId}`, {
      method: 'DELETE',
    });
  }
}
