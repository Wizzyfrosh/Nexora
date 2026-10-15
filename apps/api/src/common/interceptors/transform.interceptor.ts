// ============================================================
// Nexora API - Standard API Response Interceptor
// Wraps all successful responses in the standard format:
// { success: true, message: "...", data: {...} }
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Decorator to set a custom response message on a controller method.
 * Usage: @ResponseMessage('Product created successfully')
 */
export const ResponseMessage = (message: string) =>
  (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RESPONSE_MESSAGE_KEY, message, descriptor.value as object);
    return descriptor;
  };

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ||
      'Operation successful';

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message,
        data,
      })),
    );
  }
}
