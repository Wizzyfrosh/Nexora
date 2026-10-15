import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateBusinessDto, CreateBusinessDto } from '@nexora/shared-types';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.business.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.business.findUnique({
      where: { slug },
      include: {
        subscription: true,
      },
    });
  }

  async findByOwner(ownerId: string) {
    return this.prisma.business.findMany({
      where: { ownerId },
      include: {
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(ownerId: string, data: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        ownerId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        subscription: {
          create: {
            plan: 'TRIAL',
            status: 'TRIAL',
            trialStartDate: new Date(),
            trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  async update(id: string, data: UpdateBusinessDto) {
    return this.prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        workingHours: data.workingHours ? (data.workingHours as unknown as Prisma.InputJsonValue) : undefined,
        socialLinks: data.socialLinks ? (data.socialLinks as unknown as Prisma.InputJsonValue) : undefined,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        isPublished: data.isPublished,
      },
    });
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!business;
  }
}
