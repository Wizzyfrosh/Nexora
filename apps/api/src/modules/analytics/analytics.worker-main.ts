import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { configuration } from '../../config/configuration';
import { AnalyticsModule } from './analytics.module';
import { AnalyticsService } from './analytics.service';
import { validateWorkerEnvironment } from './worker-environment';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateWorkerEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AnalyticsModule,
  ],
})
class AnalyticsWorkerModule {}
async function main() {
  const app = await NestFactory.createApplicationContext(
    AnalyticsWorkerModule,
    { logger: ['error', 'warn'] },
  );
  try {
    const result = await app.get(AnalyticsService).drain();
    console.log(JSON.stringify(result));
    if (result.failed || result.review) process.exitCode = 1;
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void main().catch(() => {
    console.error(
      'Analytics worker failed; inspect deployment and database health',
    );
    process.exitCode = 1;
  });
