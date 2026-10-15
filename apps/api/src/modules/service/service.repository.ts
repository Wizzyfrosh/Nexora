import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateServiceDto, UpdateServiceDto } from '@nexora/shared-types';

@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findServiceById(id: string, businessId: string) {
    return this.prisma.service.findFirst({
      where: { id, businessId },
      include: {
        category: true,
      },
    });
  }

  async findServiceBySlug(businessId: string, slug: string) {
    return this.prisma.service.findUnique({
      where: { businessId_slug: { businessId, slug } },
      include: {
        category: true,
      },
    });
  }

  async getServices(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where: { businessId },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where: { businessId } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createService(businessId: string, data: CreateServiceDto, slug: string) {
    return this.prisma.service.create({
      data: {
        businessId,
        name: data.name,
        slug,
        description: data.description,
        price: data.price ? new Prisma.Decimal(data.price) : null,
        priceLabel: data.priceLabel,
        isFeatured: data.isFeatured ?? false,
        categoryId: data.categoryId,
        images: data.images ?? [],
      },
      include: {
        category: true,
      },
    });
  }

  async updateService(id: string, data: UpdateServiceDto) {
    return this.prisma.service.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price ? new Prisma.Decimal(data.price) : data.price === null ? null : undefined,
        priceLabel: data.priceLabel,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async deleteService(id: string) {
    return this.prisma.service.delete({
      where: { id },
    });
  }
}
