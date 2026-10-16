import { Module } from '@nestjs/common';
import { MediaController, MediaCapacityInterceptor } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { CloudinaryTransport } from './cloudinary.transport';
@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    CloudinaryTransport,
    MediaCapacityInterceptor,
  ],
})
export class MediaModule {}
