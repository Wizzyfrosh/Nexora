import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountPurpose } from './account-security';

@Injectable()
export class AccountSecurityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    userId: string,
    hash: string,
    familyId: string,
    expiresAt: Date,
    expectedPasswordHash?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId, deletedAt: null },
        data: { updatedAt: new Date() },
      });
      if (expectedPasswordHash && user.passwordHash !== expectedPasswordHash)
        throw new UnauthorizedException('Credentials changed; sign in again');
      await tx.refreshToken.create({
        data: { userId, token: hash, familyId, expiresAt },
      });
      return user;
    });
  }

  async rotate(hash: string, replacement: string) {
    const found = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
    });
    if (!found?.familyId) return null;
    return this.prisma.$transaction(async (tx) => {
      // The user lock serializes rotation, login and password reset without external calls.
      const user = await tx.user.findUnique({
        where: { id: found.userId, deletedAt: null },
      });
      if (!user) return null;
      await tx.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
      const current = await tx.refreshToken.findUniqueOrThrow({
        where: { id: found.id },
      });
      if (current.revokedAt || current.expiresAt <= new Date()) {
        // Return after commit, rather than throwing and rolling back replay revocation.
        await tx.refreshToken.updateMany({
          where: { userId: user.id, familyId: current.familyId },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      await tx.refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: new Date() },
      });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: replacement,
          familyId: current.familyId,
          expiresAt: current.expiresAt,
        },
      });
      return {
        user,
        familyId: current.familyId!,
        expiresAt: current.expiresAt,
      };
    });
  }

  async revokeFamily(hash: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
    });
    if (!token?.familyId) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: token.userId },
        data: { updatedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, familyId: token.familyId },
        data: { revokedAt: new Date() },
      });
    });
  }

  async isSessionActive(userId: string, familyId: string) {
    return Boolean(
      await this.prisma.refreshToken.findFirst({
        where: {
          userId,
          familyId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { deletedAt: null },
        },
        select: { id: true },
      }),
    );
  }

  async issueAction(
    userId: string,
    purpose: AccountPurpose,
    hash: string,
    encryptedToken: string,
    expiresAt: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId, deletedAt: null },
        data: { updatedAt: new Date() },
      });
      if (purpose === 'VERIFY' && user.emailVerified) return false;
      const recent =
        purpose === 'VERIFY'
          ? await tx.emailVerificationToken.findFirst({
              where: {
                email: user.email,
                createdAt: { gt: new Date(Date.now() - 60000) },
              },
            })
          : await tx.passwordResetToken.findFirst({
              where: {
                email: user.email,
                createdAt: { gt: new Date(Date.now() - 60000) },
              },
            });
      if (recent) return false;
      if (purpose === 'VERIFY') {
        await tx.emailVerificationToken.deleteMany({
          where: { email: user.email },
        });
        await tx.emailVerificationToken.create({
          data: { token: hash, email: user.email, expiresAt },
        });
      } else {
        await tx.passwordResetToken.updateMany({
          where: { email: user.email, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.create({
          data: { token: hash, email: user.email, expiresAt },
        });
      }
      await tx.accountMail.create({
        data: { userId, purpose, tokenHash: hash, encryptedToken, expiresAt },
      });
      return true;
    });
  }

  findAction(hash: string, purpose: AccountPurpose) {
    return purpose === 'VERIFY'
      ? this.prisma.emailVerificationToken.findUnique({
          where: { token: hash },
        })
      : this.prisma.passwordResetToken.findUnique({ where: { token: hash } });
  }

  async consumeAction(
    hash: string,
    purpose: AccountPurpose,
    passwordHash?: string,
  ) {
    const initial = await this.findAction(hash, purpose);
    if (!initial)
      throw new BadRequestException('Link is invalid, expired or already used');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: initial.email, deletedAt: null },
      });
      if (!user)
        throw new BadRequestException(
          'Link is invalid, expired or already used',
        );
      await tx.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
      if (purpose === 'VERIFY') {
        const claim = await tx.emailVerificationToken.deleteMany({
          where: {
            token: hash,
            email: user.email,
            expiresAt: { gt: new Date() },
          },
        });
        if (!claim.count)
          throw new BadRequestException(
            'Link is invalid, expired or already used',
          );
        await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      } else {
        const claim = await tx.passwordResetToken.updateMany({
          where: {
            token: hash,
            email: user.email,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });
        if (!claim.count || !passwordHash)
          throw new BadRequestException(
            'Link is invalid, expired or already used',
          );
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
        await tx.passwordResetToken.updateMany({
          where: { email: user.email, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: purpose === 'VERIFY' ? 'EMAIL_VERIFIED' : 'PASSWORD_RESET',
          entity: 'User',
          entityId: user.id,
        },
      });
    });
  }

  async claimMail() {
    const now = new Date();
    const mail = await this.prisma.accountMail.findFirst({
      where: { status: 'PENDING', nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: 'asc' },
    });
    if (!mail) return null;
    const claim = await this.prisma.accountMail.updateMany({
      where: { id: mail.id, status: 'PENDING', nextAttemptAt: { lte: now } },
      data: {
        attempts: { increment: 1 },
        nextAttemptAt: new Date(now.getTime() + 120000),
      },
    });
    return claim.count ? mail : null;
  }

  async mailRecipient(userId: string, hash: string, purpose: AccountPurpose) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    const token = await this.findAction(hash, purpose);
    if (
      !user ||
      !token ||
      token.email !== user.email ||
      token.expiresAt <= new Date() ||
      ('usedAt' in token && token.usedAt)
    )
      return null;
    return user.email;
  }

  finishMail(id: string, status: 'SENT' | 'CANCELLED' | 'REVIEW') {
    return this.prisma.accountMail.update({
      where: { id },
      data: { status, encryptedToken: '' },
    });
  }
  retryMail(id: string, attempts: number) {
    return this.prisma.accountMail.update({
      where: { id },
      data:
        attempts >= 5
          ? { status: 'REVIEW', encryptedToken: '' }
          : { nextAttemptAt: new Date(Date.now() + 30000 * 2 ** attempts) },
    });
  }
}
