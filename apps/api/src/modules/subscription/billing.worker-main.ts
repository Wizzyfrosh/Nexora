import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configuration } from '../../config/configuration';
import { DatabaseModule } from '../../database/database.module';
import { SubscriptionModule } from './subscription.module';
import { SubscriptionService } from './subscription.service';
import { validateBillingWorkerEnvironment } from './billing.worker-environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateBillingWorkerEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    SubscriptionModule,
  ],
})
class BillingWorkerModule {}

/** Execute one bounded pass and then release the Neon connection. */
async function main() {
  const app = await NestFactory.createApplicationContext(BillingWorkerModule, {
    logger: ['error', 'warn'],
  });
  try {
    await app.get(SubscriptionService).recoverPendingEvents(true);
    console.log('Billing recovery pass completed.');
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void main().catch(() => {
    console.error('Billing recovery failed; inspect the protected queue and worker logs');
    process.exitCode = 1;
  });
}
