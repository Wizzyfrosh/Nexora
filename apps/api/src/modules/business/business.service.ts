import { assertPublicAccess } from '../../common/security/public-access';
import { assertBusinessUrls } from '../../common/security/business-urls';
import { publicBusiness } from '../../common/security/public-projections';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BusinessRepository } from './business.repository';
import { CreateBusinessDto, UpdateBusinessDto } from '@nexora/shared-types';

@Injectable()
export class BusinessService {
  constructor(private readonly businessRepo: BusinessRepository) {}

  async createBusiness(ownerId: string, dto: CreateBusinessDto) {
    // Generate base slug if not provided, else format the provided one
    let targetSlug = dto.slug
      ? this.formatSlug(dto.slug)
      : this.formatSlug(dto.name);

    // Ensure uniqueness
    targetSlug = await this.ensureUniqueSlug(targetSlug);
    dto.slug = targetSlug;

    return this.businessRepo.create(ownerId, dto);
  }

  async getBusinessProfile(businessId: string) {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  async getPublicProfileBySlug(slug: string) {
    const business = await this.businessRepo.findBySlug(slug);
    assertPublicAccess(business);
    return publicBusiness(business!);
  }

  async getMyBusinesses(ownerId: string) {
    return this.businessRepo.findByOwner(ownerId);
  }

  async updateBusiness(businessId: string, dto: UpdateBusinessDto) {
    if (dto.isPublished !== undefined) throw new ForbiddenException('Use the dedicated website publication action');
    assertBusinessUrls(dto);
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.businessRepo.update(businessId, dto);
  }

  // ---- Private Helpers ----

  private formatSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    let exists = await this.businessRepo.checkSlugExists(slug);

    while (exists) {
      slug = `${baseSlug}-${counter}`;
      exists = await this.businessRepo.checkSlugExists(slug);
      counter++;
    }

    return slug;
  }
}
