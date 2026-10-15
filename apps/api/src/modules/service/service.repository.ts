import { assertCategoryOwnership } from '../../common/security/category';
import { assertMediaOwnership } from '../../common/security/media';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateServiceDto, UpdateServiceDto } from '@nexora/shared-types';

@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findServiceById(id: string, businessId: string) {
    return this.prisma.service.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        category: true,
      },
    });
  }

  async findServiceBySlug(businessId: string, slug: string) {
    return this.prisma.service.findFirst({
      where: { businessId, slug, deletedAt: null },
      include: {
        category: true,
      },
    });
  }

  async getServices(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where: { businessId, deletedAt: null },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where: { businessId, deletedAt: null } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createService(
    businessId: string,
    data: CreateServiceDto,
    slug: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await assertCategoryOwnership(tx, businessId, data.categoryId);
      await assertMediaOwnership(tx, businessId, data.images || []);
      return tx.service.create({
        data: {
          businessId,
          name: data.name,
          slug,
          description: data.description,
          price:
            data.price !== undefined && data.price !== null
              ? new Prisma.Decimal(data.price)
              : null,
          priceLabel: data.priceLabel,
          isFeatured: data.isFeatured ?? false,
          categoryId: data.categoryId,
          images: data.images ?? [],
        },
        include: {
          category: true,
        },
      });
    });
  }

  async updateService(id: string, businessId: string, data: UpdateServiceDto) {
    return this.prisma.$transaction(async (tx) => {
      await assertCategoryOwnership(tx, businessId, data.categoryId);
      await assertMediaOwnership(tx, businessId, data.images || []);
      return tx.service.update({
        where: { id, businessId, deletedAt: null },
        data: {
          name: data.name,
          description: data.description,
          price:
            data.price !== undefined && data.price !== null
              ? new Prisma.Decimal(data.price)
              : data.price === null
                ? null
                : undefined,
          priceLabel: data.priceLabel,
          isFeatured: data.isFeatured,
          categoryId: data.categoryId,
          images: data.images,
        },
        include: {
          category: true,
        },
      });
    });
  }

  async deleteService(id: string, businessId: string) {
    return this.prisma.service.delete({
      where: { id, businessId, deletedAt: null },
    });
  }
}
