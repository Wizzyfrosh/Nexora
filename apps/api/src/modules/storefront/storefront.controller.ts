import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StorefrontService } from './storefront.service';
class PublicationRequest {
  @Transform(({ obj }: { obj: { published: unknown } }) => obj.published)
  @IsBoolean()
  published!: boolean;
}
@Controller()
export class StorefrontController {
  constructor(private readonly sites: StorefrontService) {}
  @Public()
  @Get('storefronts/sitemap')
  @Header('Cache-Control', 'no-store')
  sitemap() {
    return this.sites.sitemap();
  }
  @Public()
  @Get('storefronts/:slug')
  @Header('Cache-Control', 'no-store')
  read(@Param('slug') slug: string, @Query('page') page?: string) {
    return this.sites.read(
      { slug },
      false,
      page === undefined ? 1 : Number(page),
    );
  }
  @UseGuards(TenantGuard)
  @Get('businesses/:businessId/storefront/preview')
  @Header('Cache-Control', 'private, no-store')
  preview(@Param('businessId') id: string) {
    return this.sites.read({ id }, true);
  }
  @UseGuards(TenantGuard)
  @Get('businesses/:businessId/storefront/publication')
  @Header('Cache-Control', 'private, no-store')
  state(@Param('businessId') id: string) {
    return this.sites.state(id);
  }
  @UseGuards(TenantGuard)
  @Put('businesses/:businessId/storefront/publication')
  publish(
    @Param('businessId') id: string,
    @CurrentUser('id') actor: string,
    @Body() body: PublicationRequest,
  ) {
    return this.sites.publish(id, actor, body.published);
  }
}
