// ============================================================
// Nexora API - Application Bootstrap
// Configures middleware, security headers, CORS, validation
// ============================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const frontendUrl = configService.get<string>('frontendUrl') || 'http://localhost:3000';

  // API versioning prefix
  app.setGlobalPrefix(apiPrefix);

  // Security headers
  app.use(helmet());

  // Cookie parser for HTTP-only cookies
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
      transform: true,          // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    }),
  );

  await app.listen(port);

  logger.log(`🚀 Nexora API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📡 CORS enabled for: ${frontendUrl}`);
  logger.log(`🔒 Environment: ${configService.get('nodeEnv')}`);
}

bootstrap();
