import { PublicBusinessGuard } from '../../common/guards/public-business.guard';
import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmRepository } from './crm.repository';

@Module({
  controllers: [CrmController],
  providers: [PublicBusinessGuard, CrmService, CrmRepository],
  exports: [CrmService],
})
export class CrmModule {}
