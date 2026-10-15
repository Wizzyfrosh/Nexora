// ============================================================
// Nexora API - Tenant Guard
// Ensures every request to tenant-scoped resources includes
// a valid businessId and the user has access to it.
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins can access any tenant
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Private tenant routes identify the tenant in the route, never in a
    // client-controlled body/query or an implicit primary-business fallback.
    const businessId = request.params.businessId;
    if (typeof businessId !== 'string' || !businessId) {
      throw new ForbiddenException('A business route parameter is required');
    }

    // Verify the user owns this business
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!business) {
      this.logger.warn(
        `Tenant isolation violation: User ${user.id} attempted to access business ${businessId}`,
      );
      throw new ForbiddenException('You do not have access to this business');
    }

    // Attach businessId to request for downstream use
    request.businessId = businessId;
    return true;
  }
}
