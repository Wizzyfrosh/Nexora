import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { ReadinessController, ReadinessService } from './readiness.controller';

describe('Nexora schema readiness', () => {
  const query = jest.fn();
  const service = new ReadinessService({ $queryRaw: query } as unknown as PrismaService);
  const controller = new ReadinessController(service);

  beforeEach(() => query.mockReset());

  it('returns only ready when tables and all seven migrations exist', async () => {
    query.mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([
        { migration_name: '20261015000000_baseline' },
        { migration_name: '20261015010000_payment_safety' },
        { migration_name: '20261015020000_recurring_billing' },
        { migration_name: '20261016000000_account_security' },
        { migration_name: '20261016010000_secure_media' },
        { migration_name: '20261016050000_private_analytics' },
        { migration_name: '20261018000000_verification_codes' },
      ]);
    await expect(controller.check()).resolves.toEqual({ status: 'ready' });
  });

  it('returns a generic 503 if production schema has not been migrated', async () => {
    query.mockResolvedValueOnce([{ ready: false }]);
    await expect(controller.check()).rejects.toThrow(
      new ServiceUnavailableException('Service is not ready'),
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('fails closed on missing or incomplete Prisma migration ledger', async () => {
    query.mockResolvedValueOnce([{ ready: true }]).mockResolvedValueOnce([
      { migration_name: '20261015000000_baseline' },
    ]);
    await expect(controller.check()).rejects.toThrow('Service is not ready');
  });

  it('returns no database errors to anonymous health callers', async () => {
    query.mockRejectedValueOnce(new Error('Sensitive database connection string or table'));
    await expect(controller.check()).rejects.toThrow('Service is not ready');
  });

  it('treats an empty result as not ready', async () => {
    query.mockResolvedValueOnce([]);
    await expect(controller.check()).rejects.toThrow('Service is not ready');
  });
});
