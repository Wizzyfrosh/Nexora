import { Controller, Get, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Liveness (a running process) must not be mistaken for production readiness.
 * The result is intentionally minimal: never expose schema details or credentials
 * to an anonymous caller.
 */
const REQUIRED_MIGRATIONS = new Set([
  '20261015000000_baseline',
  '20261015010000_payment_safety',
  '20261015020000_recurring_billing',
  '20261016000000_account_security',
  '20261016010000_secure_media',
  '20261016050000_private_analytics',
  '20261018000000_verification_codes',
]);

@Injectable()
export class ReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async verify() {
    try {
      // to_regclass avoids a SELECT on tables that do not exist on the new
      // production branch. No migrations or writes run as part of readiness.
      const tables = await this.prisma.$queryRaw<Array<{ ready: boolean }>>`
        SELECT (
          to_regclass('public._prisma_migrations') IS NOT NULL
          AND to_regclass('public.users') IS NOT NULL
          AND to_regclass('public.subscriptions') IS NOT NULL
          AND to_regclass('public.account_mails') IS NOT NULL
          AND to_regclass('public.websites') IS NOT NULL
          AND to_regclass('public.media') IS NOT NULL
        ) AS ready
      `;
      if (!tables[0]?.ready) throw new Error('Missing application schema');

      const entries = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM public._prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `;
      const applied = new Set(entries.map((entry) => entry.migration_name));
      if ([...REQUIRED_MIGRATIONS].some((name) => !applied.has(name))) {
        throw new Error('Migration history is incomplete');
      }
      return { status: 'ready' };
    } catch {
      // Deliberately hide schema, provider and database errors from callers.
      throw new ServiceUnavailableException('Service is not ready');
    }
  }
}

@Controller()
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Public()
  @Get('ready')
  check() {
    return this.readiness.verify();
  }
}
