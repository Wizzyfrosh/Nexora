// ============================================================
// Nexora API - Auth Controller
// Thin controller delegating all logic to AuthService
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  SignupRequestDto,
  LoginRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  VerifyEmailRequestDto,
  RefreshTokenRequestDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ResponseMessage } from '../../common/interceptors/transform.interceptor';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Account created successfully')
  async signup(
    @Body() dto: SignupRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(dto);

    // Set HTTP-only cookies
    res.cookie('access_token', result.tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: result.tokens.accessMaxAge,
    });
    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: result.tokens.refreshMaxAge,
    });

    return result.user;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful')
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login({
      ...dto,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Set HTTP-only cookies
    res.cookie('access_token', result.tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: result.tokens.accessMaxAge,
    });
    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: result.tokens.refreshMaxAge,
    });

    return result.user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out successfully')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: unknown = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);

    return null;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens refreshed successfully')
  async refreshTokens(
    @Req() req: Request,
    @Body() body: RefreshTokenRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: unknown =
      req.cookies?.refresh_token || body.refreshToken;

    let tokens: Awaited<ReturnType<AuthService['refreshTokens']>>;
    try {
      tokens = await this.authService.refreshTokens(refreshToken);
    } catch (error) {
      res.clearCookie('access_token', COOKIE_OPTIONS);
      res.clearCookie('refresh_token', COOKIE_OPTIONS);
      throw error;
    }

    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.accessMaxAge,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.refreshMaxAge,
    });

    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerification(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Email verified successfully')
  async verifyEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyEmailRequestDto,
  ) {
    await this.authService.verifyEmail(userId, dto.code);
    return null;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(
    'If the account is eligible and email is configured, a reset link will be sent',
  )
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    await this.authService.forgotPassword(dto.email);
    return null;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successfully')
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.resetPassword(dto.token, dto.password);
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ResponseMessage('User profile retrieved successfully')
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.authService.getCurrentUser(userId);
  }
}
