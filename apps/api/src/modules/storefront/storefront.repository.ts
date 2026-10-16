import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Persistence unit-of-work for consistent reads and atomic publication. */
@Injectable()
export class StorefrontRepository {
  constructor(private readonly prisma: PrismaService) {}
  get business() {
    return this.prisma.business;
  }
  $transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return this.prisma.$transaction(work, options);
  }
}
