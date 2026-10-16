// ============================================================
// Nexora API - Auth Repository
// Database access layer for authentication-related operations
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        businesses: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            subscription: {
              select: {
                plan: true,
                status: true,
                trialStartDate: true,
                trialEndDate: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        businesses: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            subscription: {
              select: {
                plan: true,
                status: true,
                trialStartDate: true,
                trialEndDate: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || UserRole.BUSINESS_OWNER,
      },
    });
  }

  async updateUserEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // ---- Audit Logging ----

  async createAuditLog(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Prisma.InputJsonObject;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata,
      },
    });
  }
}
