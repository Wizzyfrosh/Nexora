import { validateSections } from './website-input';
import { validateAppearance } from './appearance-input';
import { isTemplateEntitled } from '@nexora/shared-types';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async updateTheme(
    businessId: string,
    data: { theme: string; colorPalette: any; typography: any },
  ) {
    validateAppearance(data);
    await this.getWebsiteConfig(businessId); // Ensure exists
    return this.websiteRepo.updateTheme(
      businessId,
      data.theme,
      data.colorPalette,
      data.typography,
    );
  }

  async updateCustomDomain(businessId: string, customDomain: string) {
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        customDomain,
      ) ||
      customDomain.length > 253
    ) {
      throw new BadRequestException(
        'Use a hostname without protocol, port or path',
      );
    }
    // In production, you would verify DNS CNAME records here before saving
    await this.getWebsiteConfig(businessId);
    return this.websiteRepo.updateCustomDomain(businessId, customDomain);
  }

  async saveSections(businessId: string, sections: unknown) {
    validateSections(sections);
    const website = await this.getWebsiteConfig(businessId);
    return this.websiteRepo.replaceSections(businessId, website.id, sections);
  }

  async getPublicWebsiteConfig(businessId: string) {
    const website = await this.websiteRepo.findByBusinessId(businessId);
    if (!website || website.deletedAt)
      throw new NotFoundException('Website is unavailable');
    const subscription = await this.websiteRepo.getSubscriptionForBusiness(businessId);
    if (!isTemplateEntitled(website.theme, subscription))
      throw new NotFoundException('Website is unavailable');
    validateAppearance(website);
    validateSections(website.sections.filter((s) => !s.deletedAt));
    return {
      theme: website.theme,
      colorPalette: website.colorPalette,
      typography: website.typography,
      sections: website.sections
        .filter((s) => !s.deletedAt)
        .map(({ type, order, content }) => ({ type, order, content })),
    };
  }

  async getThemes() {
    return this.websiteRepo.getThemes();
  }
}
