import { redisTransportOptions } from '@app/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Deliberately not inheritAppConfig: that would run the ValidationPipe above
  // over event payloads, and transform:true calls plainToInstance() on the
  // event classes, invoking their constructors with no arguments.
  app.connectMicroservice<MicroserviceOptions>(redisTransportOptions(config));

  await app.startAllMicroservices();

  const port = Number(config.get<string>('ORDER_SERVICE_HTTP_PORT') ?? 3000);
  await app.listen(port);

  Logger.log(
    `order-service listening on :${port}, subscribed to Redis Pub/Sub`,
    'Bootstrap',
  );
}

void bootstrap();
