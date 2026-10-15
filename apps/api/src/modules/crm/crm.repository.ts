import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto } from '@nexora/shared-types';

@Injectable()
export class CrmRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(businessId: string, data: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        businessId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        source: data.source,
      },
    });
  }

  async getLeads(businessId: string, page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { businessId };

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
      where: { businessId, isRead: false },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async deleteLead(id: string) {
    return this.prisma.lead.delete({
      where: { id },
    });
  }

  async getLeadStats(businessId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, unread, thisWeek] = await Promise.all([
      this.prisma.lead.count({ where: { businessId } }),
      this.prisma.lead.count({ where: { businessId, isRead: false } }),
      this.prisma.lead.count({
        where: {
          businessId,
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    return { total, unread, thisWeek };
  }

  async trackAnalyticsEvent(businessId: string, eventType: any, metadata: any, sessionId: string) {
    return this.prisma.analyticsEvent.create({
      data: {
        businessId,
        eventType,
        metadata,
        sessionId,
      },
    });
  }
}
