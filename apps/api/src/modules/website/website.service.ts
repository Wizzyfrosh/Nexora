import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { WebsiteRepository } from './website.repository';
import { BusinessService } from '../business/business.service';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly websiteRepo: WebsiteRepository,
    private readonly businessService: BusinessService,
  ) {}

  async getWebsiteConfig(businessId: string) {
    let website = await this.websiteRepo.findByBusinessId(businessId);
    
    // Auto-initialize website config if it doesn't exist
    if (!website) {
      website = await this.websiteRepo.createDefaultWebsite(businessId);
    }
    
    return website;
  }

  async updateTheme(businessId: string, data: { theme: string; colorPalette: any; typography: any }) {
    await this.getWebsiteConfig(businessId); // Ensure exists
    return this.websiteRepo.updateTheme(businessId, data.theme, data.colorPalette, data.typography);
  }

  async updateCustomDomain(businessId: string, customDomain: string) {
    // In production, you would verify DNS CNAME records here before saving
    await this.getWebsiteConfig(businessId);
    return this.websiteRepo.updateCustomDomain(businessId, customDomain);
  }

  async saveSections(businessId: string, sections: any[]) {
    const website = await this.getWebsiteConfig(businessId);
    
    // Basic validation
    if (!Array.isArray(sections)) {
      throw new BadRequestException('Sections must be an array');
    }

    // Delete sections that were removed by the user
    const incomingSectionIds = sections.map((s) => s.id).filter(Boolean);
    const existingSections = website.sections || [];
    const sectionsToDelete = existingSections.filter(
      (s) => !incomingSectionIds.includes(s.id),
    );

    for (const s of sectionsToDelete) {
      await this.websiteRepo.deleteSection(s.id);
    }

    const savedSections = [];
    
    // Process sequentially to maintain order reliability
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const saved = await this.websiteRepo.upsertSection(
        website.id,
        s.id, // Will be undefined for new sections
        s.type,
        i, // Force order based on array index
        s.content
      );
      savedSections.push(saved);
    }

    return savedSections;
  }

  async getThemes() {
    return this.websiteRepo.getThemes();
  }
}
