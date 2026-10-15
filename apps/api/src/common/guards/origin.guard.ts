import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origin = request.headers.origin;
    const usesCookies = Boolean(
      request.cookies?.access_token || request.cookies?.refresh_token,
    );
    // Browser state changes must come from the configured web origin. Server-to-server
    // requests (including Paystack) without browser cookies need no Origin header.
    if (
      (origin && origin !== this.config.get<string>('frontendUrl')) ||
      (usesCookies && !origin)
    ) {
      throw new ForbiddenException('Request origin is not allowed');
    }
    return true;
  }
}
