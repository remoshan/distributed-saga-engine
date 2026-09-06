import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';

/**
 * Redis Pub/Sub transport options, identical for all three services.
 *
 * Built once here so a change of host or retry policy cannot be applied to
 * two services and forgotten on the third.
 */
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
