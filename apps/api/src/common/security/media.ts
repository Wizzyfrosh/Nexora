import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// All attachment writers and deletion decisions serialize on the tenant row.
export async function lockMediaTenant(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  await tx.business.update({
    where: { id: businessId, deletedAt: null },
    data: { updatedAt: new Date() },
    select: { id: true },
  });
}
export async function assertMediaOwnership(
  tx: Prisma.TransactionClient,
  businessId: string,
  urls: string[],
) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return;
  await lockMediaTenant(tx, businessId);
  const count = await tx.media.count({
    where: {
      businessId,
      status: 'READY',
      deletedAt: null,
      url: { in: unique },
    },
  });
  if (count !== unique.length)
    throw new BadRequestException(
      'Images must be verified uploads owned by this business',
    );
}
// Section schemas remain limited by website-input; media-bearing keys and any
// Cloudinary URL must use this tenant's registry. Outbound contact links are not media.
export function sectionMediaUrls(value: unknown, media = false): string[] {
  if (typeof value === 'string')
    return (media && /^(?:https?:|\/|data:)/i.test(value)) ||
      value.includes('res.cloudinary.com/')
      ? [value]
      : [];
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value))
    return value.flatMap((v) => sectionMediaUrls(v, media));
  return Object.entries(value).flatMap(([key, v]) =>
    sectionMediaUrls(
      v,
      media || /image|photo|logo|banner|background|^src$/i.test(key),
    ),
  );
}
