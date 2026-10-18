// ============================================================
// Nexora API - Auth Service
// Business logic layer for authentication operations
// Uses Argon2 for password hashing, JWT for tokens
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AccountSecurityRepository } from './account-security.repository';
import { AccountMailService } from './account-mail.service';
import type { AccountMailResponse } from '@nexora/shared-types';
import { secretToken, tokenHash, validToken } from './account-security';
import { AuthRepository } from './auth.repository';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  businessId?: string;
  sid?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly security: AccountSecurityRepository,
    private readonly mail: AccountMailService,
  ) {}

  // ---- SIGNUP ----

  async signup(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: Record<string, unknown>; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await this.authRepo.findUserByEmail(
      dto.email.toLowerCase().trim(),
    );
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user and business in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: UserRole.BUSINESS_OWNER,
        },
      });

      // Auto-create a default business with trial subscription
      const slug = this.generateSlug(dto.firstName, dto.lastName);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const business = await tx.business.create({
        data: {
          ownerId: user.id,
          name: `${dto.firstName}'s Business`,
          slug,
          subscription: {
            create: {
              plan: 'TRIAL',
              status: 'TRIAL',
              trialStartDate: new Date(),
              trialEndDate,
            },
          },
        },
        include: {
          subscription: true,
        },
      });

      // Create default website with sections
      const website = await tx.website.create({
        data: {
          businessId: business.id,
          theme: 'DEFAULT',
          colorPalette: {},
          typography: {},
        },
      });

      await tx.websiteSection.createMany({
        data: [
          {
            websiteId: website.id,
            type: 'HERO',
            order: 0,
            content: {
              headline: `Welcome to ${dto.firstName}'s Business`,
              subheadline: 'Get in touch to learn about our business.',
              buttonText: 'Get in touch',
              buttonLink: '#contact',
            },
          },
          {
            websiteId: website.id,
            type: 'ABOUT',
            order: 1,
            content: {
              title: 'About Us',
              description: 'Tell your visitors about your business.',
            },
          },
          {
            websiteId: website.id,
            type: 'CONTACT',
            order: 2,
            content: {
              title: 'Contact Us',
              email: true,
              whatsapp: true,
            },
          },
        ],
      });

      return { user, business };
    });

    // Queue a link without delaying signup on the email provider.
    try {
      await this.mail.enqueue(result.user.id, 'VERIFY');
    } catch {
      this.logger.warn(
        'Verification mail could not be queued; owner can resend',
      );
    }

    // Generate auth tokens
    const tokens = await this.generateTokens(
      {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        businessId: result.business.id,
      },
      result.user.passwordHash,
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        businesses: [result.business],
        business: {
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
          subscription: result.business.subscription,
        },
      },
      tokens,
    };
  }

  // ---- LOGIN ----

  async login(dto: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: Record<string, unknown>; tokens: AuthTokens }> {
    const user = await this.authRepo.findUserByEmail(
      dto.email.toLowerCase().trim(),
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const primaryBusiness = user.businesses[0];

    // Generate tokens
    const tokens = await this.generateTokens(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        businessId: primaryBusiness?.id,
      },
      user.passwordHash,
    );

    // Audit log
    await this.authRepo.createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
        businesses: user.businesses,
      },
      tokens,
    };
  }

  async logout(refreshToken: unknown): Promise<void> {
    if (validToken(refreshToken, 'rt'))
      await this.security.revokeFamily(tokenHash(refreshToken));
  }

  async refreshTokens(refreshToken: unknown): Promise<AuthTokens> {
    if (!validToken(refreshToken, 'rt'))
      throw new UnauthorizedException('Invalid or expired session');
    const next = secretToken('rt');
    const rotated = await this.security.rotate(
      tokenHash(refreshToken),
      tokenHash(next),
    );
    if (!rotated) throw new UnauthorizedException('Invalid or expired session');
    const business = await this.prisma.business.findFirst({
      where: { ownerId: rotated.user.id, deletedAt: null },
      select: { id: true },
    });
    return this.signTokens(
      {
        sub: rotated.user.id,
        email: rotated.user.email,
        role: rotated.user.role,
        businessId: business?.id,
        sid: rotated.familyId,
      },
      next,
      rotated.expiresAt,
    );
  }

  async resendVerification(userId: string): Promise<AccountMailResponse> {
    const user = await this.authRepo.findUserById(userId);
    if (!user) throw new UnauthorizedException('Session unavailable');
    if (user.emailVerified) return { delivery: 'ALREADY_VERIFIED' };
    return this.mail.enqueue(user.id, 'VERIFY');
  }

  async verifyEmail(userId: string, code: string): Promise<void> {
    if (
      !/^[0-9]{6}$/.test(code) ||
      !(await this.security.consumeVerification(
        userId,
        this.mail.codeHash(userId, code),
      ))
    )
      throw new BadRequestException(
        'Code is incorrect, expired or already used. Request a new code if needed.',
      );
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepo.findUserByEmail(
      email.toLowerCase().trim(),
    );
    // No synchronous SMTP call: existence does not change provider/network timing.
    if (user) {
      try {
        await this.mail.enqueue(user.id, 'RESET');
      } catch {
        this.logger.warn(
          'Recovery mail could not be queued; request remains generic',
        );
      }
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!validToken(token, 'reset'))
      throw new BadRequestException('Link is invalid, expired or already used');
    const hash = tokenHash(token),
      found = await this.security.findAction(hash, 'RESET');
    if (
      !found ||
      found.expiresAt <= new Date() ||
      ('usedAt' in found && found.usedAt)
    ) {
      throw new BadRequestException('Link is invalid, expired or already used');
    }
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    await this.security.consumeAction(hash, 'RESET', passwordHash);
  }

  // ---- GET CURRENT USER ----

  async getCurrentUser(userId: string) {
    const user = await this.authRepo.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      businesses: user.businesses,
    };
  }

  // ---- PRIVATE HELPERS ----

  private async generateTokens(
    payload: JwtPayload,
    expectedPasswordHash: string,
  ): Promise<AuthTokens> {
    const refreshToken = secretToken('rt'),
      familyId = randomUUID();
    const ttl = Math.min(
      this.parseExpiration(
        this.configService.get<string>('jwt.refreshExpiration') || '7d',
      ),
      30 * 86400000,
    );
    const expiresAt = new Date(Date.now() + ttl);
    await this.security.createSession(
      payload.sub,
      tokenHash(refreshToken),
      familyId,
      expiresAt,
      expectedPasswordHash,
    );
    return this.signTokens(
      { ...payload, sid: familyId },
      refreshToken,
      expiresAt,
    );
  }

  private signTokens(
    payload: JwtPayload,
    refreshToken: string,
    expiresAt: Date,
  ): AuthTokens {
    const refreshMaxAge = Math.max(0, expiresAt.getTime() - Date.now());
    const accessMaxAge = Math.min(
      refreshMaxAge,
      15 * 60000,
      this.parseExpiration(
        this.configService.get<string>('jwt.accessExpiration') || '15m',
      ),
    );
    if (accessMaxAge < 1000) throw new UnauthorizedException('Session expired');
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: Math.floor(accessMaxAge / 1000),
    });
    return { accessToken, refreshToken, accessMaxAge, refreshMaxAge };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private generateSlug(firstName: string, lastName: string): string {
    const base = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = randomUUID().slice(0, 8);
    return `${base}-${suffix}`;
  }
}
