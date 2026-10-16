import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
export async function assertCategoryOwnership(
  tx: Prisma.TransactionClient,
  businessId: string,
  categoryId?: string,
) {
  if (categoryId === undefined || categoryId === null) return;
  if (
    typeof categoryId !== 'string' ||
    !categoryId ||
    !(await tx.category.findFirst({
      where: { id: categoryId, businessId, deletedAt: null },
      select: { id: true },
    }))
  )
    throw new BadRequestException('Category does not belong to this business');
}
