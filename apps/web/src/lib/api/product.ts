// ============================================================
// Nexora Web — Product & Category API Client
// Typed methods for managing catalog resources
// ============================================================

import { apiFetch } from './client';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  CreateCategoryDto,
  IProduct,
  ICategory
} from '@nexora/shared-types';

export interface PaginatedProducts {
  data: IProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductService {
  /**
   * Get all products for a business with pagination.
   */
  static async getProducts(
    businessId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<PaginatedProducts> {
    return apiFetch<PaginatedProducts>(`/businesses/${businessId}/products?page=${page}&limit=${limit}`);
  }

  /**
   * Get a single product by ID.
   */
  static async getProduct(businessId: string, productId: string): Promise<IProduct> {
    return apiFetch<IProduct>(`/businesses/${businessId}/products/${productId}`);
  }

  /**
   * Create a new product.
   */
  static async createProduct(businessId: string, dto: CreateProductDto): Promise<IProduct> {
    return apiFetch<IProduct>(`/businesses/${businessId}/products`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Update an existing product.
   */
  static async updateProduct(
    businessId: string, 
    productId: string, 
    dto: UpdateProductDto
  ): Promise<IProduct> {
    return apiFetch<IProduct>(`/businesses/${businessId}/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Delete a product.
   */
  static async deleteProduct(businessId: string, productId: string): Promise<void> {
    await apiFetch(`/businesses/${businessId}/products/${productId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all categories for a business.
   */
  static async getCategories(businessId: string): Promise<ICategory[]> {
    return apiFetch<ICategory[]>(`/businesses/${businessId}/products/categories/all`);
  }

  /**
   * Create a new product category.
   */
  static async createCategory(businessId: string, dto: CreateCategoryDto): Promise<ICategory> {
    return apiFetch<ICategory>(`/businesses/${businessId}/products/categories`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
