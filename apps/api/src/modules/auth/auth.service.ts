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
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  businessId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- SIGNUP ----

  async signup(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: Record<string, unknown>; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await this.authRepo.findUserByEmail(dto.email);
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
              title: `Welcome to ${dto.firstName}'s Business`,
              subtitle: 'Your professional mini website is ready',
              ctaText: 'Get Started',
              ctaLink: '#contact',
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
              showForm: true,
              showWhatsApp: true,
            },
          },
        ],
      });

      return { user, business };
    });

    // Generate email verification token
    const verificationToken = uuidv4();
    await this.authRepo.createEmailVerificationToken({
      token: verificationToken,
      email: result.user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Generate auth tokens
    const tokens = await this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      businessId: result.business.id,
    });

    this.logger.log(`New user registered: ${result.user.email}`);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
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
    const user = await this.authRepo.findUserByEmail(dto.email.toLowerCase().trim());

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
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
      dto.userAgent,
      dto.ipAddress,
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

    this.logger.log(`User logged in: ${user.email}`);

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

  // ---- LOGOUT ----

  async logout(refreshToken: string, userId: string): Promise<void> {
    await this.authRepo.revokeRefreshToken(refreshToken);

    await this.authRepo.createAuditLog({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  // ---- REFRESH TOKEN ----

  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthTokens> {
    const storedToken = await this.authRepo.findRefreshToken(refreshToken);

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (rotation)
    await this.authRepo.revokeRefreshToken(refreshToken);

    const user = storedToken.user;
    const primaryBusiness = await this.prisma.business.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      select: { id: true },
    });

    // Generate new tokens
    return this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: primaryBusiness?.id,
    });
  }

  // ---- EMAIL VERIFICATION ----

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.authRepo.findEmailVerificationToken(token);

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.authRepo.findUserByEmail(verificationToken.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.authRepo.updateUserEmailVerified(user.id);
    await this.authRepo.deleteEmailVerificationToken(verificationToken.id);

    this.logger.log(`Email verified: ${user.email}`);
  }

  // ---- FORGOT PASSWORD ----

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepo.findUserByEmail(email.toLowerCase().trim());

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    const resetToken = uuidv4();
    await this.authRepo.createPasswordResetToken({
      token: resetToken,
      email: user.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // TODO: Send email with reset link
    this.logger.log(`Password reset requested for: ${user.email}`);
  }

  // ---- RESET PASSWORD ----

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.authRepo.findPasswordResetToken(token);

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.authRepo.findUserByEmail(resetToken.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.authRepo.updateUserPassword(user.id, passwordHash);
    await this.authRepo.markPasswordResetTokenUsed(resetToken.id);

    // Revoke all existing refresh tokens for security
    await this.authRepo.revokeAllUserRefreshTokens(user.id);

    this.logger.log(`Password reset completed for: ${user.email}`);
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
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessExpiration'),
    });

    const refreshToken = uuidv4();
    const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresInMs = this.parseExpiration(refreshExpiration);

    await this.authRepo.createRefreshToken({
      token: refreshToken,
      userId: payload.sub,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + expiresInMs),
    });

    return { accessToken, refreshToken };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private generateSlug(firstName: string, lastName: string): string {
    const base = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
