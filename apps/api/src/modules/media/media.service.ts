import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MEDIA_MAX_BYTES } from '@nexora/shared-types';
import { CloudinaryTransport } from './cloudinary.transport';
import { MediaRepository } from './media.repository';
import { sanitizeImage } from './media-image';

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private cleaning = false;
  private activeUploads = 0;
  constructor(
    private readonly repo: MediaRepository,
    private readonly transport: CloudinaryTransport,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.cleanup().catch(() => undefined);
    }, 15_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  list(businessId: string) {
    return this.repo.list(businessId);
  }
  remove(businessId: string, id: string) {
    return this.repo.remove(businessId, id);
  }
  async upload(businessId: string, buffer: Buffer, mime: string) {
    // Keep the CPU/provider slot until the actual promise settles, even if a
    // disconnected HTTP subscriber releases its multipart-buffering slot early.
    if (this.activeUploads >= 2)
      throw new ServiceUnavailableException('Uploads are busy; retry shortly');
    this.activeUploads++;
    try {
      return await this.uploadFile(businessId, buffer, mime);
    } finally {
      this.activeUploads--;
    }
  }
  private async uploadFile(businessId: string, buffer: Buffer, mime: string) {
    this.transport.configured();
    const image = await sanitizeImage(buffer, mime);
    const intent = await this.repo.reserve(businessId);
    try {
      const result = await this.transport.upload(intent.publicId, image.data);
      if (
        result.public_id !== intent.publicId ||
        result.resource_type !== 'image' ||
        result.type !== 'upload' ||
        result.format !== 'webp' ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(result.asset_id || '') ||
        !Number.isSafeInteger(result.version) ||
        result.version <= 0 ||
        result.bytes !== image.data.length ||
        result.bytes > MEDIA_MAX_BYTES ||
        result.width !== image.width ||
        result.height !== image.height
      )
        throw new ServiceUnavailableException(
          'Media storage returned an invalid asset',
        );
      return await this.repo.ready(intent.id, businessId, {
        url: this.transport.url(intent.publicId, result.version),
        sizeBytes: result.bytes,
        width: result.width,
        height: result.height,
        assetId: result.asset_id,
      });
    } catch (error) {
      await this.repo.fail(intent.id); // Durable cleanup covers ambiguous remote acceptance.
      throw error;
    }
  }
  async cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      this.transport.configured();
      for (const job of await this.repo.claimCleanup()) {
        let ok = false;
        try {
          await this.transport.destroy(job.publicId);
          ok = true;
        } catch {
          /* No raw provider/token errors in logs. */
        }
        await this.repo.cleanupResult(job.id, ok);
      }
    } finally {
      this.cleaning = false;
    }
  }
}
