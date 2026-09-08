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
  // No HTTP surface: init() instead of listen().
  await app.init();

  Logger.log('inventory-service subscribed to Redis Pub/Sub', 'Bootstrap');
}

void bootstrap();
