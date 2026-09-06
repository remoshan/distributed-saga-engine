import {
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Injection token for the shared ioredis connection. */
export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis =>
    new Redis({
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: Number(config.getOrThrow<string>('REDIS_PORT')),
      // Fail fast on a bad connection rather than queueing commands forever.
      maxRetriesPerRequest: 3,
    }),
};

/**
 * Provides the ioredis connection used for idempotency bookkeeping.
 *
 * This is deliberately separate from the connection @nestjs/microservices
 * opens for Pub/Sub. A Redis client in subscriber mode may only issue
 * subscribe/unsubscribe commands, so reusing that connection for SET would
 * fail at runtime.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
