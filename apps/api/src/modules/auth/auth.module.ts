// ============================================================
// Nexora API - Auth Module
// Wires together auth service, repository, strategies, and guards
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountSecurityRepository } from './account-security.repository';
import {
  AccountMailService,
  SmtpAccountTransport,
} from './account-mail.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret') || '',
        signOptions: {
          expiresIn: 900, // AuthService supplies the per-session bounded TTL.
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    JwtStrategy,
    JwtAuthGuard,
    AccountSecurityRepository,
    AccountMailService,
    SmtpAccountTransport,
  ],
  exports: [AuthService, AuthRepository, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
