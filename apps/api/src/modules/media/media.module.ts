import { Module } from '@nestjs/common';
import { MediaController, MediaCapacityInterceptor } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { NeonStorageTransport } from './neon-storage.transport';
@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    NeonStorageTransport,
    MediaCapacityInterceptor,
  ],
})
export class MediaModule {}
