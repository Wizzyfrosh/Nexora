import { Module } from '@nestjs/common';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { WebsiteRepository } from './website.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [BusinessModule],
  controllers: [WebsiteController],
  providers: [WebsiteService, WebsiteRepository],
  exports: [WebsiteService],
})
export class WebsiteModule {}
