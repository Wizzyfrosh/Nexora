import { BadRequestException } from '@nestjs/common';
export function assertPagination(page: number, limit: number) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    page > 1_000_000
  ) {
    throw new BadRequestException(
      'Use page >= 1 (maximum 1000000) and limit between 1 and 100',
    );
  }
}
