import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.ttlSeconds = Number(config.get<string>('IDEMPOTENCY_TTL_SECONDS') ?? 86400);
  }

  // Scoped by consumer, not just eventId: payment_failed is consumed by both
  // order-service and inventory-service, and a shared key would let whichever
  // handled it first lock the other out of its compensating transaction.
  private key(consumer: string, eventId: string): string {
    return `saga:idempotency:${consumer}:${eventId}`;
  }

  async claim(consumer: string, eventId: string): Promise<boolean> {
    const result = await this.redis.set(
      this.key(consumer, eventId),
      new Date().toISOString(),
      'EX',
      this.ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async release(consumer: string, eventId: string): Promise<void> {
    await this.redis.del(this.key(consumer, eventId));
  }

  /** Returns false when the event was a duplicate and the handler was skipped. */
  async runOnce(
    consumer: string,
    eventId: string,
    handler: () => Promise<void>,
  ): Promise<boolean> {
    if (!(await this.claim(consumer, eventId))) {
      return false;
    }

    try {
      await handler();
      return true;
    } catch (error) {
      // Release so a redelivery can retry rather than being swallowed.
      await this.release(consumer, eventId);
      this.logger.error(
        `handler failed for eventId=${eventId}, claim released for retry`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
