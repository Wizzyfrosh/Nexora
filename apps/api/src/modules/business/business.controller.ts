import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateBusinessDto, UpdateBusinessDto } from '@nexora/shared-types';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

// Local validation DTOs mapped to shared-types
class UpdateBusinessRequestDto implements UpdateBusinessDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsArray() @IsOptional() workingHours?: any[];
  @IsObject() @IsOptional() socialLinks?: any;
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() bannerUrl?: string;
  @IsBoolean() @IsOptional() isPublished?: boolean;
}

class CreateBusinessRequestDto implements CreateBusinessDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
}

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // ---- Public Routes ----

  @Public()
  @Get('slug/:slug')
  @ResponseMessage('Public business profile retrieved')
  async getPublicProfile(@Param('slug') slug: string) {
    return this.businessService.getPublicProfileBySlug(slug);
  }

  // ---- Authenticated Routes ----

  @UseGuards(JwtAuthGuard)
  @Get('my-businesses')
  @ResponseMessage('Your businesses retrieved')
  async getMyBusinesses(@CurrentUser('id') userId: string) {
    return this.businessService.getMyBusinesses(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ResponseMessage('Business created successfully')
  async createBusiness(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBusinessRequestDto,
  ) {
    return this.businessService.createBusiness(userId, dto);
  }

  // ---- Tenant Scoped Routes ----

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':businessId')
  @ResponseMessage('Business profile retrieved')
  async getBusinessProfile(@Param('businessId') businessId: string) {
    return this.businessService.getBusinessProfile(businessId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':businessId')
  @ResponseMessage('Business profile updated successfully')
  async updateBusiness(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessRequestDto,
  ) {
    return this.businessService.updateBusiness(businessId, dto);
  }
}
