import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NeonStorageTransport } from './neon-storage.transport';
import { MediaRepository } from './media.repository';
import { sanitizeImage } from './media-image';

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private cleaning = false;
  private activeUploads = 0;
  constructor(
    private readonly repo: MediaRepository,
    private readonly transport: NeonStorageTransport,
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
      await this.transport.upload(intent.publicId, image.data);

      return await this.repo.ready(intent.id, businessId, {
        url: this.transport.url(intent.publicId),
        sizeBytes: image.data.length,
        width: image.width,
        height: image.height,
        assetId: intent.id,
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
