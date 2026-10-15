// ============================================================
// Nexora API - Auth Repository
// Database access layer for authentication-related operations
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

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

  // ---- Refresh Tokens ----

  async createRefreshToken(data: {
    token: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revokeRefreshToken(token: string) {
    return this.prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---- Email Verification Tokens ----

  async createEmailVerificationToken(data: {
    token: string;
    email: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailVerificationToken.create({ data });
  }

  async findEmailVerificationToken(token: string) {
    return this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
  }

  async deleteEmailVerificationToken(id: string) {
    return this.prisma.emailVerificationToken.delete({ where: { id } });
  }

  // ---- Password Reset Tokens ----

  async createPasswordResetToken(data: {
    token: string;
    email: string;
    expiresAt: Date;
  }) {
    return this.prisma.passwordResetToken.create({ data });
  }

  async findPasswordResetToken(token: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ---- Audit Logging ----

  async createAuditLog(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ 
      data: {
        ...data,
        metadata: data.metadata as any
      } 
    });
  }
}
