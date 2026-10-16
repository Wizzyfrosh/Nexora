import { Injectable, HttpException } from '@nestjs/common';
import { assertPublicAccess } from '../../common/security/public-access';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto } from '@nexora/shared-types';

@Injectable()
export class CrmRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(businessId: string, data: CreateLeadDto) {
    return this.prisma.$transaction(async tx => {
      await tx.business.update({ where: { id: businessId, deletedAt: null }, data: { updatedAt: new Date() } });
      const business = await tx.business.findUniqueOrThrow({ where: { id: businessId }, include: { subscription: true, owner: { select: { emailVerified: true, deletedAt: true } } } });
      assertPublicAccess(business);
      if (await tx.lead.count({ where: { businessId, createdAt: { gte: new Date(Date.now() - 3600_000) } } }) >= 100)
        throw new HttpException('Message capacity reached; try again later', 429);
      return tx.lead.create({
      data: {
        businessId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        source: data.source,
      },
      });
    });
  }

  async getLeads(
    businessId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { businessId, deletedAt: null };

    // Add search filter across name, email, and phone
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(businessId: string) {
    return this.prisma.lead.count({
      where: { businessId, isRead: false, deletedAt: null },
    });
  }

  async markAsRead(id: string, businessId: string) {
    return this.prisma.lead.update({
      where: { id, businessId, deletedAt: null },
      data: { isRead: true },
    });
  }

  async deleteLead(id: string, businessId: string) {
    return this.prisma.lead.delete({
      where: { id, businessId, deletedAt: null },
    });
  }

  async getLeadStats(businessId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, unread, thisWeek] = await Promise.all([
      this.prisma.lead.count({ where: { businessId, deletedAt: null } }),
      this.prisma.lead.count({
        where: { businessId, isRead: false, deletedAt: null },
      }),
      this.prisma.lead.count({
        where: {
          businessId,
          deletedAt: null,
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    return { total, unread, thisWeek };
  }

}
