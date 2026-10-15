import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MEDIA_MAX_BYTES } from '@nexora/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { lockMediaTenant, sectionMediaUrls } from '../../common/security/media';

export const mediaProjection = {
  id: true,
  url: true,
  sizeBytes: true,
  width: true,
  height: true,
  createdAt: true,
} as const;
@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}
  async reserve(businessId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockMediaTenant(tx, businessId);
      const assets = await tx.media.findMany({
        where: { businessId, status: { not: 'DELETED' } },
        select: { sizeBytes: true },
      });
      if (
        assets.length >= 100 ||
        assets.reduce((n, m) => n + m.sizeBytes, 0) + MEDIA_MAX_BYTES >
          250 * 1024 * 1024
      )
        throw new BadRequestException(
          'Media quota reached (100 files / 250 MiB, including pending cleanup)',
        );
      const id = randomUUID();
      return tx.media.create({
        data: {
          id,
          businessId,
          type: 'GALLERY_IMAGE',
          status: 'PENDING',
          url: '',
          publicId: `nexora/${businessId}/${id}`,
          sizeBytes: MEDIA_MAX_BYTES,
          cleanupAt: new Date(Date.now() + 15 * 60_000),
        },
      });
    });
  }
  async ready(
    id: string,
    businessId: string,
    data: {
      url: string;
      sizeBytes: number;
      width: number;
      height: number;
      assetId: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockMediaTenant(tx, businessId);
      const changed = await tx.media.updateMany({
        where: {
          id,
          businessId,
          status: 'PENDING',
          cleanupAt: { gt: new Date() },
        },
        data: { ...data, status: 'READY', cleanupAt: null },
      });
      if (changed.count !== 1)
        throw new ConflictException('Upload expired; retry with a new file');
      return tx.media.findUniqueOrThrow({
        where: { id },
        select: mediaProjection,
      });
    });
  }
  async fail(id: string) {
    // Keep the grace deadline: a timed-out provider may still be finishing upload.
    await this.prisma.media.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DELETING' },
    });
  }
  list(businessId: string) {
    return this.prisma.media.findMany({
      where: { businessId, status: 'READY', deletedAt: null },
      select: mediaProjection,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async remove(businessId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockMediaTenant(tx, businessId);
      const asset = await tx.media.findFirst({ where: { id, businessId } });
      if (!asset) throw new NotFoundException('Media not found');
      if (['DELETING', 'DELETED', 'REVIEW'].includes(asset.status))
        return { status: asset.status };
      if (asset.status !== 'READY')
        throw new ConflictException('Media is not ready for deletion');
      const business = await tx.business.findUniqueOrThrow({
        where: { id: businessId },
      });
      const product = await tx.productImage.findFirst({
        where: { url: asset.url, product: { businessId } },
        select: { id: true },
      });
      const service = await tx.service.findFirst({
        where: { businessId, images: { array_contains: [asset.url] } },
        select: { id: true },
      });
      const sections = await tx.websiteSection.findMany({
        where: { website: { businessId } },
        select: { content: true },
      });
      if (
        business.logoUrl === asset.url ||
        business.bannerUrl === asset.url ||
        product ||
        service ||
        sections.some((s) => sectionMediaUrls(s.content).includes(asset.url))
      )
        throw new ConflictException(
          'This image is in use. Remove it from all content before deleting',
        );
      await tx.media.update({
        where: { id },
        data: {
          status: 'DELETING',
          deletedAt: new Date(),
          cleanupAt: new Date(),
        },
      });
      return { status: 'DELETING' };
    });
  }
  async claimCleanup() {
    const due = await this.prisma.media.findMany({
      where: {
        status: { in: ['PENDING', 'DELETING'] },
        cleanupAt: { lte: new Date() },
      },
      orderBy: { cleanupAt: 'asc' },
      take: 5,
    });
    const claimed: typeof due = [];
    for (const row of due) {
      const result = await this.prisma.media.updateMany({
        where: { id: row.id, status: row.status, cleanupAt: row.cleanupAt },
        data: { status: 'DELETING', cleanupAt: new Date(Date.now() + 120_000) },
      });
      if (result.count) claimed.push(row);
    }
    return claimed;
  }
  async cleanupResult(id: string, ok: boolean) {
    const row = await this.prisma.media.findUniqueOrThrow({ where: { id } });
    const attempts = row.attempts + 1;
    await this.prisma.media.update({
      where: { id },
      data: ok
        ? { status: 'DELETED', deletedAt: new Date(), cleanupAt: null }
        : {
            attempts,
            status: attempts >= 5 ? 'REVIEW' : 'DELETING',
            cleanupAt:
              attempts >= 5
                ? null
                : new Date(Date.now() + 60_000 * 2 ** attempts),
          },
    });
  }
}
