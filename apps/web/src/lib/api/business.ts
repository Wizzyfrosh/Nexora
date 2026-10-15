// ============================================================
// Nexora Web — Business API Client
// Typed methods for business profile endpoints
// ============================================================

import { UpdateBusinessDto, DayOfWeek } from '@nexora/shared-types';
import { apiFetch } from './client';

export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  workingHours: Array<{
    day: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
  isPublished: boolean;
  subscription: {
    plan: string;
    status: string;
    trialStartDate: string;
    trialEndDate: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export class BusinessService {
  /**
   * Get a business profile by ID (authenticated, tenant-scoped).
   */
  static async getProfile(businessId: string): Promise<BusinessProfile> {
    return apiFetch<BusinessProfile>(`/businesses/${businessId}`);
  }

  /**
   * Update a business profile.
   */
  static async updateProfile(businessId: string, dto: UpdateBusinessDto): Promise<BusinessProfile> {
    return apiFetch<BusinessProfile>(`/businesses/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Get all businesses owned by the current user.
   */
  static async getMyBusinesses(): Promise<BusinessProfile[]> {
    return apiFetch<BusinessProfile[]>('/businesses/my-businesses');
  }
}
