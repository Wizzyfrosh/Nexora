import {
  BadRequestException,
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  NestInterceptor,
  Param,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { finalize } from 'rxjs';
import { MEDIA_MAX_BYTES } from '@nexora/shared-types';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MediaService } from './media.service';

@Injectable()
export class MediaCapacityInterceptor implements NestInterceptor {
  private active = 0;
  intercept(_context: ExecutionContext, next: CallHandler) {
    if (this.active >= 2)
      throw new ServiceUnavailableException('Uploads are busy; retry shortly');
    this.active++;
    return next.handle().pipe(
      finalize(() => {
        this.active--;
      }),
    );
  }
}
@Controller('businesses/:businessId/media')
@UseGuards(TenantGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get() list(@Param('businessId') businessId: string) {
    return this.media.list(businessId);
  }
  @Delete(':mediaId') remove(
    @Param('businessId') businessId: string,
    @Param('mediaId') id: string,
  ) {
    return this.media.remove(businessId, id);
  }
  @Post()
  @UseInterceptors(
    MediaCapacityInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_MAX_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  upload(
    @Param('businessId') businessId: string,
    @CurrentUser('emailVerified') verified: boolean,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
    @Body() body?: Record<string, unknown>,
  ) {
    if (!verified)
      throw new ForbiddenException('Verify your email before uploading images');
    if (!file || Object.keys(body || {}).length)
      throw new BadRequestException('Send exactly one image file');
    return this.media.upload(businessId, file.buffer, file.mimetype);
  }
}
