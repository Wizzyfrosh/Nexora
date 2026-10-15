import { TenantGuard } from './tenant.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
const findFirst = jest.fn();
const guard = new TenantGuard({
  business: { findFirst },
} as unknown as PrismaService);
const context = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext;
describe('explicit tenant authorization', () => {
  beforeEach(() => jest.resetAllMocks());
  it('ignores a forged businessId in the body when route tenant is unauthorized', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        context({
          user: { id: 'a' },
          params: { businessId: 'tenant-b' },
          body: { businessId: 'tenant-a' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'tenant-b', ownerId: 'a', deletedAt: null },
      select: { id: true },
    });
  });
  it('cannot infer authority from a body/query when route tenant is missing', async () => {
    await expect(
      guard.canActivate(
        context({
          user: { id: 'a' },
          params: {},
          body: { businessId: 'tenant-a' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('allows the owner of an existing nondeleted tenant', async () => {
    findFirst.mockResolvedValue({ id: 'tenant-a' });
    expect(
      await guard.canActivate(
        context({ user: { id: 'a' }, params: { businessId: 'tenant-a' } }),
      ),
    ).toBe(true);
  });
});
