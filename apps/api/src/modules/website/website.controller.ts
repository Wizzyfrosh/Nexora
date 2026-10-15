import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WebsiteService } from './website.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';
import { Public } from '../auth/decorators/public.decorator';

@Controller('websites')
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Public()
  @Get('public/:businessId')
  @ResponseMessage('Public website configuration retrieved')
  async getPublicWebsite(@Param('businessId') businessId: string) {
    // Used by the generated mini-website to fetch its data
    return this.websiteService.getWebsiteConfig(businessId);
  }

  @Public()
  @Get('themes')
  @ResponseMessage('Available themes retrieved')
  async getThemes() {
    return this.websiteService.getThemes();
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':businessId')
  @ResponseMessage('Website configuration retrieved')
  async getWebsiteConfig(@Param('businessId') businessId: string) {
    return this.websiteService.getWebsiteConfig(businessId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':businessId/theme')
  @ResponseMessage('Theme updated successfully')
  async updateTheme(
    @Param('businessId') businessId: string,
    @Body() data: { theme: string; colorPalette: any; typography: any },
  ) {
    return this.websiteService.updateTheme(businessId, data);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':businessId/sections')
  @ResponseMessage('Website sections saved successfully')
  async saveSections(
    @Param('businessId') businessId: string,
    @Body() data: { sections: any[] },
  ) {
    return this.websiteService.saveSections(businessId, data.sections);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Put(':businessId/domain')
  @ResponseMessage('Custom domain updated')
  async updateCustomDomain(
    @Param('businessId') businessId: string,
    @Body() data: { customDomain: string },
  ) {
    return this.websiteService.updateCustomDomain(businessId, data.customDomain);
  }
}
