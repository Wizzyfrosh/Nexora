import { PublicBusinessGuard } from '../../common/guards/public-business.guard';
import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceRepository } from './service.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [BusinessModule],
  controllers: [ServiceController],
  providers: [PublicBusinessGuard, ServiceService, ServiceRepository],
  exports: [ServiceService],
})
export class ServiceModule {}
