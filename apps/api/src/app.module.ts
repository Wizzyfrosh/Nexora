// ============================================================
// Nexora API - Root Application Module
// Assembles all domain modules into the modular monolith
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { configuration } from './config';
import { DatabaseModule } from './database';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { WebsiteModule } from './modules/website/website.module';
import { ProductModule } from './modules/product/product.module';
import { ServiceModule } from './modules/service/service.module';
import { CrmModule } from './modules/crm/crm.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OriginGuard } from './common/guards/origin.guard';
import { validateEnvironment } from './config/validate-environment';
import { MediaModule } from './modules/media/media.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  controllers: [AppController],
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database (global)
    DatabaseModule,

    // Domain modules
    AuthModule,
    BusinessModule,
    SubscriptionModule,
    WebsiteModule,
    ProductModule,
    ServiceModule,
    CrmModule,
    MediaModule,
    StorefrontModule,
    AnalyticsModule,
  ],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: OriginGuard },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global JWT auth guard (routes must use @Public() to opt out)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
