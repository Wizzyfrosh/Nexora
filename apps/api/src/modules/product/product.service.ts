import { publicProduct } from '../../common/security/public-projections';
import { assertPagination } from '../../common/security/pagination';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
} from '@nexora/shared-types';

@Injectable()
export class ProductService {
  constructor(private readonly productRepo: ProductRepository) {}

  // ---- Categories ----

  async getCategories(businessId: string) {
    return this.productRepo.getCategories(businessId);
  }

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    const slug = this.formatSlug(dto.name);
    const existing = await this.productRepo.findCategoryBySlug(
      businessId,
      slug,
    );

    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    return this.productRepo.createCategory(businessId, dto, slug);
  }

  // ---- Products ----

  async getProducts(businessId: string, page: number = 1, limit: number = 20) {
    assertPagination(page, limit);
    const result = await this.productRepo.getProducts(businessId, page, limit);
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

  async getProduct(businessId: string, productId: string) {
    const product = await this.productRepo.findProductById(
      productId,
      businessId,
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product.category &&
      (product.category.businessId !== businessId || product.category.deletedAt)
      ? { ...product, category: null }
      : product;
  }

  async getPublicProductBySlug(businessId: string, slug: string) {
    const product = await this.productRepo.findProductBySlug(businessId, slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return publicProduct(product);
  }

  async getPublicProducts(businessId: string, page = 1, limit = 20) {
    const result = await this.getProducts(businessId, page, limit);
    return { ...result, data: result.data.map(publicProduct) };
  }

  async createProduct(businessId: string, dto: CreateProductDto) {
    let slug = this.formatSlug(dto.name);
    slug = await this.ensureUniqueProductSlug(businessId, slug);

    return this.productRepo.createProduct(businessId, dto, slug);
  }

  async updateProduct(
    businessId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const existing = await this.getProduct(businessId, productId);

    // We only update if the business actually owns it (already verified in getProduct)
    return this.productRepo.updateProduct(existing.id, businessId, dto);
  }

  async deleteProduct(businessId: string, productId: string) {
    const existing = await this.getProduct(businessId, productId);
    return this.productRepo.deleteProduct(existing.id, businessId);
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

  private async ensureUniqueProductSlug(
    businessId: string,
    baseSlug: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    let exists = await this.productRepo.findProductBySlug(businessId, slug);

    while (exists) {
      slug = `${baseSlug}-${counter}`;
      exists = await this.productRepo.findProductBySlug(businessId, slug);
      counter++;
    }

    return slug;
  }
}
