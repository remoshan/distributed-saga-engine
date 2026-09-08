import { redisTransportOptions } from '@app/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>(redisTransportOptions(config));
  await app.startAllMicroservices();
  await app.init();

  const simulate = config.get<string>('PAYMENT_SIMULATE_FAILURE') === 'true';
  Logger.log(
    `payment-service subscribed to Redis Pub/Sub (simulate failure: ${simulate})`,
    'Bootstrap',
  );
}

void bootstrap();
