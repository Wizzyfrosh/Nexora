import {
  CreateServiceRequest,
  UpdateServiceRequest,
} from '../../common/dto/content.dto';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { PublicBusinessGuard } from '../../common/guards/public-business.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('businesses/:businessId/services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // ---- Public Routes (For the storefronts) ----

  @Public()
  @UseGuards(PublicBusinessGuard)
  @Get('public/slug/:slug')
  @ResponseMessage('Public service retrieved')
  async getPublicServiceBySlug(
    @Param('businessId') businessId: string,
    @Param('slug') slug: string,
  ) {
    return this.serviceService.getPublicServiceBySlug(businessId, slug);
  }

  @Public()
  @UseGuards(PublicBusinessGuard)
  @Get('public/list')
  @ResponseMessage('Public services list retrieved')
  async getPublicServicesList(
    @Param('businessId') businessId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.serviceService.getPublicServices(businessId, page, limit);
  }

  // ---- Tenant Scoped Management Routes ----

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get()
  @ResponseMessage('Services retrieved successfully')
  async getServices(
    @Param('businessId') businessId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.serviceService.getServices(businessId, page, limit);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':serviceId')
  @ResponseMessage('Service details retrieved')
  async getService(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.serviceService.getService(businessId, serviceId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post()
  @ResponseMessage('Service created successfully')
  async createService(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceRequest,
  ) {
    return this.serviceService.createService(businessId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':serviceId')
  @ResponseMessage('Service updated successfully')
  async updateService(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceRequest,
  ) {
    return this.serviceService.updateService(businessId, serviceId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Delete(':serviceId')
  @ResponseMessage('Service deleted successfully')
  async deleteService(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    await this.serviceService.deleteService(businessId, serviceId);
    return null;
  }
}
