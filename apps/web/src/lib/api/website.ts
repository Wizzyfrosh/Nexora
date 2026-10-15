// ============================================================
// Nexora Web — Website API Client
// Typed methods for website engine endpoints
// ============================================================

import { apiFetch } from './client';

export interface WebsiteSection {
  id: string;
  websiteId: string;
  type: string;
  order: number;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteConfig {
  id: string;
  businessId: string;
  theme: string;
  colorPalette: Record<string, string>;
  typography: Record<string, string>;
  customDomain: string | null;
  sections: WebsiteSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ThemePreset {
  id: string;
  themeId: string;
  name: string;
  isPremium: boolean;
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  previewImageUrl: string | null;
}

export class WebsiteService {
  /**
   * Get the website configuration for a business (authenticated, tenant-gated).
   */
  static async getWebsiteConfig(businessId: string): Promise<WebsiteConfig> {
    return apiFetch<WebsiteConfig>(`/websites/${businessId}`);
  }

  /**
   * Save website sections. Handles upserting and removing deleted sections.
   */
  static async saveSections(businessId: string, sections: any[]): Promise<WebsiteSection[]> {
    return apiFetch<WebsiteSection[]>(`/websites/${businessId}/sections`, {
      method: 'PUT',
      body: JSON.stringify({ sections }),
    });
  }

  /**
   * Update the website's theme selection, typography, and color palette.
   */
  static async updateTheme(
    businessId: string,
    data: { theme: string; colorPalette: Record<string, string>; typography: Record<string, string> },
  ): Promise<WebsiteConfig> {
    return apiFetch<WebsiteConfig>(`/websites/${businessId}/theme`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all available themes seeded in the system.
   */
  static async getThemes(): Promise<ThemePreset[]> {
    return apiFetch<ThemePreset[]>('/websites/themes');
  }

  /**
   * Update the custom domain for the business website.
   */
  static async updateCustomDomain(businessId: string, customDomain: string): Promise<WebsiteConfig> {
    return apiFetch<WebsiteConfig>(`/websites/${businessId}/domain`, {
      method: 'PUT',
      body: JSON.stringify({ customDomain }),
    });
  }
}
