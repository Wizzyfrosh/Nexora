import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, ProductAvailability } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, CreateCategoryDto } from '@nexora/shared-types';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Categories ----

  async findCategoryBySlug(businessId: string, slug: string) {
    return this.prisma.category.findUnique({
      where: { businessId_slug: { businessId, slug } },
    });
  }

  async getCategories(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId },
      include: {
        _count: {
          select: { products: true, services: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(businessId: string, data: CreateCategoryDto, slug: string) {
    return this.prisma.category.create({
      data: {
        businessId,
        name: data.name,
        slug,
        description: data.description,
      },
    });
  }

  // ---- Products ----

  async findProductById(id: string, businessId: string) {
    return this.prisma.product.findFirst({
      where: { id, businessId },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
    });
  }

  async findProductBySlug(businessId: string, slug: string) {
    return this.prisma.product.findUnique({
      where: { businessId_slug: { businessId, slug } },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
    });
  }

  async getProducts(businessId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: { businessId } })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createProduct(businessId: string, data: CreateProductDto, slug: string) {
    return this.prisma.product.create({
      data: {
        businessId,
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        availability: data.availability as ProductAvailability,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId,
        images: {
          create: data.images?.map((img) => ({
            url: img.url,
            altText: img.altText,
            order: img.order,
          })) || [],
        },
      },
      include: {
        images: true,
        category: true,
      },
    });
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price ? new Prisma.Decimal(data.price) : undefined,
        compareAtPrice: data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice) : undefined,
        availability: data.availability as ProductAvailability,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId,
      },
      include: {
        images: true,
        category: true,
      },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
