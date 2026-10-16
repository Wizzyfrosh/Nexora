import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  Storefront,
  RELEASED_THEMES,
  releasedSections,
  PublicationState,
} from '@nexora/shared-types';
import { StorefrontRepository } from './storefront.repository';
import { assertPublicAccess } from '../../common/security/public-access';
import { sectionMediaUrls } from '../../common/security/media';

const include = {
  subscription: true,
  owner: { select: { emailVerified: true, deletedAt: true } },
  website: {
    include: {
      sections: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' as const },
      },
    },
  },
};
type SiteBusiness = Prisma.BusinessGetPayload<{ include: typeof include }>;
@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: StorefrontRepository,
    private readonly config: ConfigService,
  ) {}
  private enabled() {
    return this.config.get<boolean>('publishingEnabled') === true;
  }
  private reasons(b: SiteBusiness): string[] {
    const reasons: string[] = [];
    if (!this.enabled())
      reasons.push('Public publishing is disabled pending launch approval');
    if (!b.owner.emailVerified)
      reasons.push('Verify your email before publishing');
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug) ||
      b.slug.length > 100 ||
      !b.name.trim() ||
      b.name.length > 160
    )
      reasons.push('Set a valid business name and slug');
    try {
      assertPublicAccess({ ...b, isPublished: true });
    } catch {
      reasons.push('An active trial or paid subscription is required');
    }
    try {
      if (
        !b.website ||
        b.website.deletedAt ||
        !RELEASED_THEMES.includes(
          b.website.theme as (typeof RELEASED_THEMES)[number],
        )
      )
        throw new Error();
      const sections = releasedSections(b.website.sections);
      if (
        !sections.some((s) => s.type === 'HERO') ||
        !sections.some((s) => s.type === 'CONTACT')
      )
        throw new Error();
    } catch {
      reasons.push(
        'Save a released theme with valid Hero and Contact sections',
      );
    }
    return reasons;
  }
  async state(businessId: string): Promise<PublicationState> {
    const b = await this.prisma.business.findUnique({
      where: { id: businessId, deletedAt: null },
      include,
    });
    if (!b) throw new NotFoundException('Business not found');
    return {
      isPublished: b.isPublished,
      slug: b.slug,
      publishingEnabled: this.enabled(),
      reasons: this.reasons(b),
    };
  }
  async publish(businessId: string, actorId: string, published: boolean) {
    return this.prisma.$transaction(async (tx) => {
      // Billing updates serialize on the subscription row; publication shares that boundary.
      await tx.subscription.updateMany({
        where: { businessId },
        data: { updatedAt: new Date() },
      });
      await tx.business.update({
        where: { id: businessId, deletedAt: null },
        data: { updatedAt: new Date() },
      });
      const b = await tx.business.findUniqueOrThrow({
        where: { id: businessId },
        include,
      });
      if (published) {
        if (!this.enabled())
          throw new ServiceUnavailableException(
            'Public publishing is disabled pending launch approval',
          );
        const reasons = this.reasons(b);
        if (reasons.length) throw new BadRequestException(reasons.join('. '));
        const urls = sectionMediaUrls(
          b.website?.sections.map((s) => s.content),
        );
        const count = await tx.media.count({
          where: {
            businessId,
            status: 'READY',
            deletedAt: null,
            url: { in: [...new Set(urls)] },
          },
        });
        if (count !== new Set(urls).size)
          throw new BadRequestException(
            'Re-upload unverified section images before publishing',
          );
      }
      await tx.business.update({
        where: { id: businessId },
        data: { isPublished: published },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: published ? 'WEBSITE_PUBLISHED' : 'WEBSITE_UNPUBLISHED',
          entity: 'Business',
          entityId: businessId,
        },
      });
      return { isPublished: published };
    });
  }
  async read(
    key: { slug: string } | { id: string },
    preview = false,
    page = 1,
  ): Promise<Storefront> {
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new BadRequestException('Page must be between 1 and 10000');
    return this.prisma.$transaction(
      async (tx) => {
        const b = await tx.business.findUnique({ where: key, include });
        if (!b || b.deletedAt)
          throw new NotFoundException('Business website is unavailable');
        if (!preview) {
          assertPublicAccess(b);
          if (!b.owner.emailVerified)
            throw new NotFoundException('Business website is unavailable');
        }
        const site = b.website;
        if (!site || site.deletedAt)
          throw new NotFoundException('Website configuration is unavailable');
        let sections;
        try {
          if (
            !RELEASED_THEMES.includes(
              site.theme as (typeof RELEASED_THEMES)[number],
            )
          )
            throw new Error();
          sections = releasedSections(site.sections);
          if (
            !preview &&
            (!sections.some((s) => s.type === 'HERO') ||
              !sections.some((s) => s.type === 'CONTACT'))
          )
            throw new Error();
        } catch {
          if (preview)
            throw new BadRequestException(
              'Choose a released theme and valid sections in My website',
            );
          throw new NotFoundException('Business website is unavailable');
        }
        const media = await tx.media.findMany({
          where: { businessId: b.id, status: 'READY', deletedAt: null },
          select: { url: true },
          take: 100,
        });
        const owned = new Set(media.map((m) => m.url));
        if (sectionMediaUrls(sections).some((url) => !owned.has(url))) {
          if (preview)
            throw new BadRequestException(
              'Replace unverified section images with your own uploads',
            );
          throw new NotFoundException('Business website is unavailable');
        }
        const [products, services, productsTotal, servicesTotal] =
          await Promise.all([
            tx.product.findMany({
              where: { businessId: b.id, deletedAt: null },
              orderBy: [{ isFeatured: 'desc' }, { id: 'asc' }],
              skip: (page - 1) * 50,
              take: 50,
              include: { images: { orderBy: { order: 'asc' }, take: 20 } },
            }),
            tx.service.findMany({
              where: { businessId: b.id, deletedAt: null },
              orderBy: [{ isFeatured: 'desc' }, { id: 'asc' }],
              skip: (page - 1) * 50,
              take: 50,
            }),
            tx.product.count({ where: { businessId: b.id, deletedAt: null } }),
            tx.service.count({ where: { businessId: b.id, deletedAt: null } }),
          ]);
        if (!preview) assertPublicAccess(b, new Date());
        const text = (v: string | null, max: number) =>
          v ? v.slice(0, max) : null;
        return {
          analyticsEnabled: this.config.get<boolean>('analyticsEnabled') === true,
          business: {
            id: b.id,
            name: b.name.slice(0, 160),
            slug: b.slug,
            description: text(b.description, 10000),
            logoUrl: b.logoUrl && owned.has(b.logoUrl) ? b.logoUrl : null,
            bannerUrl:
              b.bannerUrl && owned.has(b.bannerUrl) ? b.bannerUrl : null,
            address: text(b.address, 1000),
            email:
              b.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)
                ? b.email.slice(0, 254)
                : null,
            phone:
              b.phone && /^\+?[0-9 ()-]{5,30}$/.test(b.phone) ? b.phone : null,
            whatsapp:
              b.whatsapp && /^\+?[0-9 ()-]{5,30}$/.test(b.whatsapp)
                ? b.whatsapp.replace(/\D/g, '')
                : null,
          },
          theme: site.theme,
          primary: /^#[a-fA-F0-9]{6}$/.test(
            String((site.colorPalette as Record<string, unknown>)?.primary),
          )
            ? String((site.colorPalette as Record<string, unknown>).primary)
            : '#8044b6',
          sections,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price.toString(),
            availability: p.availability,
            images: p.images
              .filter((i) => owned.has(i.url))
              .slice(0, 20)
              .map((i) => ({ url: i.url, altText: i.altText })),
          })),
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price?.toString() ?? null,
            priceLabel: s.priceLabel,
            images: Array.isArray(s.images)
              ? s.images
                  .filter(
                    (v): v is string => typeof v === 'string' && owned.has(v),
                  )
                  .slice(0, 20)
              : [],
          })),
          productsTotal,
          servicesTotal,
          page,
          pageSize: 50,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async sitemap() {
    const now = new Date();
    const rows = await this.prisma.business.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        owner: { emailVerified: true, deletedAt: null },
        subscription: {
          deletedAt: null,
          OR: [
            { status: 'TRIAL', trialEndDate: { gt: now } },
            { status: 'ACTIVE', currentPeriodEnd: { gt: now } },
          ],
        },
      },
      orderBy: { id: 'asc' },
      take: 100,
      select: {
        slug: true,
        website: {
          select: {
            theme: true,
            deletedAt: true,
            sections: {
              where: { deletedAt: null },
              take: 6,
              select: { type: true, content: true },
            },
          },
        },
        media: {
          where: { status: 'READY', deletedAt: null },
          select: { url: true },
          take: 100,
        },
      },
    });
    // Bounded pilot sitemap; no per-business renderer queries/N+1 fan-out.
    return rows.flatMap((b) => {
      try {
        if (
          !b.website ||
          b.website.deletedAt ||
          !RELEASED_THEMES.includes(
            b.website.theme as (typeof RELEASED_THEMES)[number],
          )
        )
          return [];
        const sections = releasedSections(b.website.sections);
        if (
          !sections.some((s) => s.type === 'HERO') ||
          !sections.some((s) => s.type === 'CONTACT')
        )
          return [];
        const owned = new Set(b.media.map((m) => m.url));
        return sectionMediaUrls(sections).every((url) => owned.has(url))
          ? [b.slug]
          : [];
      } catch {
        return [];
      }
    });
  }
}
