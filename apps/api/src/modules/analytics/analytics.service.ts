import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyticsCapture,
  AnalyticsReport,
  PUBLIC_ANALYTICS_EVENTS,
  RELEASED_THEMES,
  releasedSections,
} from '@nexora/shared-types';
import { AnalyticsBusiness, AnalyticsRepository } from './analytics.repository';
import { assertPublicAccess } from '../../common/security/public-access';
import { sectionMediaUrls } from '../../common/security/media';

export function assertAnalyticsSite(b: AnalyticsBusiness) {
  assertPublicAccess(b);
  try {
    if (
      !b.website ||
      b.website.deletedAt ||
      !RELEASED_THEMES.includes(
        b.website.theme as (typeof RELEASED_THEMES)[number],
      )
    )
      throw new Error();
    const sections = releasedSections(b.website.sections),
      owned = new Set(b.media.map((m) => m.url));
    if (
      !sections.some((s) => s.type === 'HERO') ||
      !sections.some((s) => s.type === 'CONTACT') ||
      sectionMediaUrls(sections).some((url) => !owned.has(url))
    )
      throw new Error();
  } catch {
    throw new NotFoundException('Business website is unavailable');
  }
}
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly config: ConfigService,
  ) {}
  enabled() {
    return this.config.get<boolean>('analyticsEnabled') === true;
  }
  async capture(businessId: string, input: AnalyticsCapture) {
    if (!this.enabled())
      throw new ServiceUnavailableException(
        'Optional visit counting is disabled',
      );
    if (
      input.consent !== true ||
      !PUBLIC_ANALYTICS_EVENTS.includes(input.eventType)
    )
      throw new BadRequestException('Unsupported visit event');
    return this.repo.accept(businessId, input, assertAnalyticsSite);
  }
  async report(businessId: string, days: number): Promise<AnalyticsReport> {
    if (![7, 30, 90].includes(days))
      throw new BadRequestException('Choose 7, 30 or 90 days');
    const now = new Date(),
      today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
    const from = new Date(today - (days - 1) * 86400_000),
      until = new Date(today + 86400_000);
    const rows = await this.repo.report(businessId, from, until);
    const series = Array.from({ length: days }, (_, i) => ({
      date: new Date(from.getTime() + i * 86400_000).toISOString().slice(0, 10),
      pageViews: 0,
      whatsappClicks: 0,
      enquiries: 0,
    }));
    const indexed = new Map(series.map((day) => [day.date, day]));
    for (const row of rows.daily) {
      const day = indexed.get(row.day.toISOString().slice(0, 10));
      if (!day) continue;
      if (row.eventType === 'PAGE_VIEW') day.pageViews += row.count;
      if (row.eventType === 'WHATSAPP_CLICK') day.whatsappClicks += row.count;
    }
    for (const row of rows.leads) {
      const day = indexed.get(row.day.toISOString().slice(0, 10));
      if (day) day.enquiries = row.count;
    }
    const totals = series.reduce(
      (total, day) => ({
        pageViews: total.pageViews + day.pageViews,
        whatsappClicks: total.whatsappClicks + day.whatsappClicks,
        enquiries: total.enquiries + day.enquiries,
      }),
      { pageViews: 0, whatsappClicks: 0, enquiries: 0 },
    );
    const latest = rows.daily.reduce<Date | null>(
      (v, r) => (!v || r.updatedAt > v ? r.updatedAt : v),
      null,
    );
    return {
      collectionEnabled: this.enabled(),
      days: days as 7 | 30 | 90,
      from: from.toISOString().slice(0, 10),
      through: new Date(today).toISOString().slice(0, 10),
      totals,
      series,
      processing: {
        pending: rows.pending,
        review: rows.review,
        oldestPendingAt: rows.oldest?.toISOString() ?? null,
        lastAggregatedAt: latest?.toISOString() ?? null,
      },
    };
  }
  async drain(limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException('Worker batch must be 1–50');
    const result = {
      processed: 0,
      failed: 0,
      observationsPruned: 0,
      dailyPruned: 0,
    };
    for (let i = 0; i < limit; i++) {
      const outcome = await this.repo.processNext();
      if (outcome === 'empty') break;
      result[outcome === 'processed' ? 'processed' : 'failed']++;
    }
    const pruned = await this.repo.prune();
    result.observationsPruned = pruned.observations;
    result.dailyPruned = pruned.daily;
    if (result.failed)
      this.logger.warn(
        'Analytics aggregation failed; inspect tenant review/backlog counts',
      );
    return { ...result, ...(await this.repo.backlog()) };
  }
}
