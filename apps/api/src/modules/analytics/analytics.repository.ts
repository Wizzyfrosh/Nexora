import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsObservation, Prisma } from '@prisma/client';
import { AnalyticsCapture } from '@nexora/shared-types';
import { PrismaService } from '../../database/prisma.service';

export const analyticsBusinessInclude = {
  subscription: true,
  owner: { select: { emailVerified: true, deletedAt: true } },
  website: { include: { sections: { where: { deletedAt: null } } } },
  media: {
    where: { status: 'READY', deletedAt: null },
    take: 100,
    select: { url: true },
  },
} satisfies Prisma.BusinessInclude;
export type AnalyticsBusiness = Prisma.BusinessGetPayload<{
  include: typeof analyticsBusinessInclude;
}>;
const dayStart = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
const retentionCutoff = () => new Date(Date.now() - 7 * 86400_000);

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async accept(
    businessId: string,
    input: AnalyticsCapture,
    assertEligible: (b: AnalyticsBusiness) => void,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize dedupe + tenant/hour capacity across API replicas.
      // Lock without marking the owner's profile as edited on each visitor event.
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "businesses" WHERE "id" = ${businessId} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!locked.length)
        throw new NotFoundException('Business website is unavailable');
      const b = await tx.business.findUniqueOrThrow({
        where: { id: businessId },
        include: analyticsBusinessInclude,
      });
      assertEligible(b);
      const existing = await tx.analyticsObservation.findUnique({
        where: { businessId_eventId: { businessId, eventId: input.eventId } },
        select: { id: true },
      });
      if (existing) return { accepted: true };
      const [hour, queued] = await Promise.all([
        tx.analyticsObservation.count({
          where: {
            businessId,
            receivedAt: { gte: new Date(Date.now() - 3600_000) },
          },
        }),
        tx.analyticsObservation.count({
          where: { businessId, status: { in: ['PENDING', 'REVIEW'] } },
        }),
      ]);
      if (hour >= 1000 || queued >= 10000)
        throw new HttpException('Visit counting capacity reached', 429);
      await tx.analyticsObservation.create({
        data: {
          businessId,
          eventId: input.eventId,
          eventType: input.eventType,
          receivedAt: new Date(),
          availableAt: new Date(),
        },
      });
      return { accepted: true };
    });
  }
  async report(businessId: string, from: Date, until: Date) {
    return this.prisma.$transaction(
      async (tx) => {
        const [daily, leads, pending, review, oldest] = await Promise.all([
          tx.analyticsDaily.findMany({
            where: { businessId, day: { gte: from, lt: until } },
            select: {
              day: true,
              eventType: true,
              count: true,
              updatedAt: true,
            },
          }),
          tx.$queryRaw<
            { day: Date; count: number }[]
          >`SELECT "createdAt"::date AS day, COUNT(*)::int AS count FROM "leads" WHERE "businessId" = ${businessId} AND "deletedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${until} GROUP BY "createdAt"::date`,
          tx.analyticsObservation.count({
            where: { businessId, status: 'PENDING' },
          }),
          tx.analyticsObservation.count({
            where: { businessId, status: 'REVIEW' },
          }),
          tx.analyticsObservation.aggregate({
            where: { businessId, status: 'PENDING' },
            _min: { receivedAt: true },
          }),
        ]);
        return {
          daily,
          leads,
          pending,
          review,
          oldest: oldest._min.receivedAt,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  /** All DB effects and acknowledgement share a transaction; a crash rolls both back. */
  async processNext() {
    let claimed: AnalyticsObservation | undefined;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          AnalyticsObservation[]
        >`SELECT * FROM "analytics_observations" WHERE "status" = 'PENDING' AND "availableAt" <= (NOW() AT TIME ZONE 'UTC') AND "receivedAt" >= ${retentionCutoff()} ORDER BY "availableAt", "receivedAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED`;
        const row = rows[0];
        if (!row) return 'empty' as const;
        claimed = row;
        await this.increment(tx, row);
        await tx.analyticsObservation.update({
          where: { id: row.id },
          data: { status: 'DONE', processedAt: new Date() },
        });
        return 'processed' as const;
      });
    } catch (error) {
      if (!claimed) throw error;
      // Compare-and-set failure state after rollback. Do not overwrite a concurrent success.
      const attempts = claimed.attempts + 1;
      await this.prisma.analyticsObservation.updateMany({
        where: {
          id: claimed.id,
          status: 'PENDING',
          attempts: claimed.attempts,
        },
        data: {
          attempts,
          status: attempts >= 5 ? 'REVIEW' : 'PENDING',
          availableAt: new Date(
            Date.now() + Math.min(300, 2 ** attempts) * 1000,
          ),
        },
      });
      return 'failed' as const;
    }
  }
  async increment(tx: Prisma.TransactionClient, row: AnalyticsObservation) {
    if (!['PAGE_VIEW', 'WHATSAPP_CLICK'].includes(row.eventType))
      throw new Error('Unsupported queued event');
    const day = dayStart(row.receivedAt);
    return tx.analyticsDaily.upsert({
      where: {
        businessId_day_eventType: {
          businessId: row.businessId,
          day,
          eventType: row.eventType,
        },
      },
      create: {
        businessId: row.businessId,
        day,
        eventType: row.eventType,
        count: 1,
      },
      update: { count: { increment: 1 } },
    });
  }
  async prune() {
    const rawCutoff = retentionCutoff(),
      dailyCutoff = new Date(dayStart(new Date()).getTime() - 89 * 86400_000);
    return this.prisma.$transaction(async (tx) => {
      const observations =
        await tx.$executeRaw`DELETE FROM "analytics_observations" WHERE "id" IN (SELECT "id" FROM "analytics_observations" WHERE "receivedAt" < ${rawCutoff} ORDER BY "receivedAt" LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
      const daily =
        await tx.$executeRaw`DELETE FROM "analytics_daily" WHERE "id" IN (SELECT "id" FROM "analytics_daily" WHERE "day" < ${dailyCutoff} ORDER BY "day" LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
      return { observations, daily };
    });
  }
  async backlog() {
    const [pending, review, oldest] = await Promise.all([
      this.prisma.analyticsObservation.count({ where: { status: 'PENDING' } }),
      this.prisma.analyticsObservation.count({ where: { status: 'REVIEW' } }),
      this.prisma.analyticsObservation.aggregate({
        where: { status: 'PENDING' },
        _min: { receivedAt: true },
      }),
    ]);
    return {
      pending,
      review,
      oldestPendingAt: oldest._min.receivedAt?.toISOString() ?? null,
    };
  }
}
