import { BadRequestException } from '@nestjs/common';
import { SectionInput } from './website-input';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WebsiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string) {
    return this.prisma.website.findUnique({
      where: { businessId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async createDefaultWebsite(businessId: string, theme: string = 'DEFAULT') {
    return this.prisma.website.create({
      data: {
        businessId,
        theme,
        colorPalette: {
          primary: '#4f46e5',
          secondary: '#f3f4f6',
          accent: '#10b981',
        },
        typography: {
          heading: 'Inter',
          body: 'Inter',
        },
        sections: {
          create: [
            {
              type: 'HERO',
              order: 0,
              content: {
                headline: 'Welcome to our store',
                subheadline: 'Find the best products here.',
                buttonText: 'Shop Now',
              },
            },
            {
              type: 'ABOUT',
              order: 1,
              content: {
                title: 'About Us',
                description:
                  'We are a dedicated team providing the best value.',
              },
            },
            {
              type: 'CONTACT',
              order: 2,
              content: {
                title: 'Get in Touch',
                email: true,
                whatsapp: true,
              },
            },
          ],
        },
      },
      include: {
        sections: true,
      },
    });
  }

  async updateTheme(
    businessId: string,
    theme: string,
    colorPalette: any,
    typography: any,
  ) {
    return this.prisma.website.update({
      where: { businessId },
      data: {
        theme,
        colorPalette,
        typography,
      },
    });
  }

  async updateCustomDomain(businessId: string, customDomain: string) {
    return this.prisma.website.update({
      where: { businessId },
      data: { customDomain },
    });
  }

  async replaceSections(
    businessId: string,
    websiteId: string,
    sections: SectionInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Parent row lock serializes complete saves; failures roll back every write.
      await tx.website.update({
        where: { id: websiteId, businessId, deletedAt: null },
        data: { updatedAt: new Date() },
        select: { id: true },
      });
      const existing = await tx.websiteSection.findMany({
        where: { websiteId, deletedAt: null },
        select: { id: true },
      });
      const allowed = new Set(existing.map((s) => s.id));
      const ids = sections.flatMap((s) => (s.id ? [s.id] : []));
      if (
        new Set(ids).size !== ids.length ||
        ids.some((id) => !allowed.has(id))
      )
        throw new BadRequestException(
          'A section does not belong to this website',
        );
      await tx.websiteSection.deleteMany({
        where: { websiteId, deletedAt: null, id: { notIn: ids } },
      });
      for (const [order, section] of sections.entries()) {
        const data = { type: section.type, order, content: section.content };
        if (section.id)
          await tx.websiteSection.update({
            where: { id: section.id, websiteId, deletedAt: null },
            data,
          });
        else await tx.websiteSection.create({ data: { ...data, websiteId } });
      }
      return tx.websiteSection.findMany({
        where: { websiteId, deletedAt: null },
        orderBy: { order: 'asc' },
      });
    });
  }

  async getThemes() {
    return this.prisma.theme.findMany();
  }
}
