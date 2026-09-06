import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

/**
 * Event de-duplication backed by Redis.
 *
 * Redis Pub/Sub gives at-most-once delivery, but a service that restarts
 * mid-handler, or a manually replayed event, can still deliver the same
 * eventId twice. Without a guard, a replayed `order_created` would deduct
 * stock a second time and a replayed `inventory_released` would restore it
 * twice — the ledger would drift with no error anywhere.
 */
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

  /**
   * The key is scoped by consumer, not just by eventId.
   *
   * `payment_failed` is consumed by BOTH order-service and inventory-service.
   * A key of just the eventId would let whichever service handled it first
   * lock the other one out, silently skipping the compensating transaction.
   */
  private key(consumer: string, eventId: string): string {
    return `saga:idempotency:${consumer}:${eventId}`;
  }

  /**
   * Atomically claims an event. Returns true exactly once per (consumer,
   * eventId) pair within the TTL window. SET NX is a single round trip, so
   * two concurrent deliveries cannot both win.
   */
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

  /** Releases a claim so a redelivery can retry. Used when a handler throws. */
  async release(consumer: string, eventId: string): Promise<void> {
    await this.redis.del(this.key(consumer, eventId));
  }

  /**
   * Runs `handler` at most once for this (consumer, eventId).
   *
   * Returns false when the event was a duplicate and the handler was skipped.
   * If the handler throws, the claim is released before rethrowing so the
   * event is not permanently swallowed by a transient failure.
   */
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
      await this.release(consumer, eventId);
      this.logger.error(
        `handler failed for eventId=${eventId}, claim released for retry`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
