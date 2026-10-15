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

    // Extract businessId from route params or body
    const businessId =
      request.params.businessId ||
      request.body?.businessId ||
      request.query?.businessId;

    if (!businessId) {
      // If no businessId, try to resolve from user's primary business
      const business = await this.prisma.business.findFirst({
        where: {
          ownerId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (business) {
        request.businessId = business.id;
        return true;
      }

      throw new ForbiddenException('No business associated with this account');
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
