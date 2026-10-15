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
                description: 'We are a dedicated team providing the best value.',
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
            }
          ]
        }
      },
      include: {
        sections: true,
      }
    });
  }

  async updateTheme(businessId: string, theme: string, colorPalette: any, typography: any) {
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

  async upsertSection(websiteId: string, sectionId: string | undefined, type: any, order: number, content: any) {
    if (sectionId) {
      return this.prisma.websiteSection.update({
        where: { id: sectionId },
        data: { type, order, content },
      });
    } else {
      return this.prisma.websiteSection.create({
        data: {
          websiteId,
          type,
          order,
          content,
        },
      });
    }
  }

  async deleteSection(sectionId: string) {
    return this.prisma.websiteSection.delete({
      where: { id: sectionId },
    });
  }

  async getThemes() {
    return this.prisma.theme.findMany();
  }
}
