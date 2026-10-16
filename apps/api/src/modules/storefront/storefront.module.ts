import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontRepository } from './storefront.repository';
import { StorefrontService } from './storefront.service';
@Module({
  controllers: [StorefrontController],
  providers: [StorefrontRepository, StorefrontService],
})
export class StorefrontModule {}
