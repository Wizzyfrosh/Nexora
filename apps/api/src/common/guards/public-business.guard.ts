import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { assertPublicAccess } from '../security/public-access';

@Injectable()
export class PublicBusinessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: { businessId: string } }>();
    const business = await this.prisma.business.findUnique({
      where: { id: request.params.businessId },
      select: {
        isPublished: true,
        deletedAt: true,
        subscription: {
          select: {
            status: true,
            trialEndDate: true,
            currentPeriodEnd: true,
            deletedAt: true,
          },
        },
      },
    });
    assertPublicAccess(business);
    return true;
  }
}
