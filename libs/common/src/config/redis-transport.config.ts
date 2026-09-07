import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';

export function redisTransportOptions(config: ConfigService): RedisOptions {
  return {
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: Number(config.getOrThrow<string>('REDIS_PORT')),
      retryAttempts: 5,
      retryDelay: 1000,
    },
  };
}

export const SAGA_CLIENT = 'SAGA_CLIENT';
