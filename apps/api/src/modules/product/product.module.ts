import { PublicBusinessGuard } from '../../common/guards/public-business.guard';
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [BusinessModule],
  controllers: [ProductController],
  providers: [PublicBusinessGuard, ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
