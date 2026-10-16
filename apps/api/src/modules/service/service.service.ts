import { publicService } from '../../common/security/public-projections';
import { assertPagination } from '../../common/security/pagination';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceRepository } from './service.repository';
import { CreateServiceDto, UpdateServiceDto } from '@nexora/shared-types';

@Injectable()
export class ServiceService {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async getServices(businessId: string, page: number = 1, limit: number = 20) {
    assertPagination(page, limit);
    const result = await this.serviceRepo.getServices(businessId, page, limit);
    return {
      ...result,
      data: result.data.map((item) =>
        item.category &&
        (item.category.businessId !== businessId || item.category.deletedAt)
          ? { ...item, category: null }
          : item,
      ),
    };
  }

  async getService(businessId: string, serviceId: string) {
    const service = await this.serviceRepo.findServiceById(
      serviceId,
      businessId,
    );
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service.category &&
      (service.category.businessId !== businessId || service.category.deletedAt)
      ? { ...service, category: null }
      : service;
  }

  async getPublicServiceBySlug(businessId: string, slug: string) {
    const service = await this.serviceRepo.findServiceBySlug(businessId, slug);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return publicService(service);
  }

  async getPublicServices(businessId: string, page = 1, limit = 20) {
    const result = await this.getServices(businessId, page, limit);
    return { ...result, data: result.data.map(publicService) };
  }

  async createService(businessId: string, dto: CreateServiceDto) {
    let slug = this.formatSlug(dto.name);
    slug = await this.ensureUniqueServiceSlug(businessId, slug);

    return this.serviceRepo.createService(businessId, dto, slug);
  }

  async updateService(
    businessId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ) {
    const existing = await this.getService(businessId, serviceId);
    return this.serviceRepo.updateService(existing.id, businessId, dto);
  }

  async deleteService(businessId: string, serviceId: string) {
    const existing = await this.getService(businessId, serviceId);
    return this.serviceRepo.deleteService(existing.id, businessId);
  }

  // ---- Helpers ----

  private formatSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueServiceSlug(
    businessId: string,
    baseSlug: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    let exists = await this.serviceRepo.findServiceBySlug(businessId, slug);

    while (exists) {
      slug = `${baseSlug}-${counter}`;
      exists = await this.serviceRepo.findServiceBySlug(businessId, slug);
      counter++;
    }

    return slug;
  }
}
