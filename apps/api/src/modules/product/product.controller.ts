import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { Public } from '../auth/decorators/public.decorator';

@Controller('businesses/:businessId/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ---- Public Routes (For the storefronts) ----

  @Public()
  @Get('public/slug/:slug')
  @ResponseMessage('Public product retrieved')
  async getPublicProductBySlug(
    @Param('businessId') businessId: string,
    @Param('slug') slug: string,
  ) {
    return this.productService.getPublicProductBySlug(businessId, slug);
  }

  @Public()
  @Get('public/list')
  @ResponseMessage('Public products list retrieved')
  async getPublicProductsList(
    @Param('businessId') businessId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productService.getProducts(businessId, page, limit);
  }

  // ---- Tenant Scoped Management Routes ----

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get()
  @ResponseMessage('Products retrieved successfully')
  async getProducts(
    @Param('businessId') businessId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productService.getProducts(businessId, page, limit);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':productId')
  @ResponseMessage('Product details retrieved')
  async getProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.getProduct(businessId, productId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post()
  @ResponseMessage('Product created successfully')
  async createProduct(
    @Param('businessId') businessId: string,
    @Body() dto: any, // CreateProductDto - validation pipes applied globally
  ) {
    return this.productService.createProduct(businessId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':productId')
  @ResponseMessage('Product updated successfully')
  async updateProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: any, // UpdateProductDto
  ) {
    return this.productService.updateProduct(businessId, productId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Delete(':productId')
  @ResponseMessage('Product deleted successfully')
  async deleteProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    await this.productService.deleteProduct(businessId, productId);
    return null;
  }

  // ---- Categories ----

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('categories/all')
  @ResponseMessage('Categories retrieved')
  async getCategories(@Param('businessId') businessId: string) {
    return this.productService.getCategories(businessId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('categories')
  @ResponseMessage('Category created')
  async createCategory(
    @Param('businessId') businessId: string,
    @Body() dto: any, // CreateCategoryDto
  ) {
    return this.productService.createCategory(businessId, dto);
  }
}
