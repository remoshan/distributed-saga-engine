import { randomUUID } from 'node:crypto';

/**
 * The envelope carried by every event on the bus.
 *
 * `correlationId` is minted once when an order is placed and copied unchanged
 * onto every downstream event, so a single saga can be traced end to end
 * across all three services by grepping one value out of the logs.
 *
 * `eventId` is unique per emission and is what the idempotency guard keys on.
 * Two different events in the same saga share a correlationId but never an
 * eventId; a redelivery of the *same* event repeats both.
 */
export interface SagaEventEnvelope {
  readonly eventId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

/**
 * Base class for outbound events. Subclasses fill in their own payload.
 *
 * Note this class is only ever used on the publishing side. Events arrive at a
 * consumer as plain JSON objects, not class instances, so handlers type their
 * parameter as the class but must never call methods on it or rely on
 * `instanceof`. Structural typing is what makes that safe.
 */
export abstract class SagaEvent implements SagaEventEnvelope {
  readonly eventId: string;
  readonly correlationId: string;
  readonly occurredAt: string;

  protected constructor(correlationId: string) {
    this.eventId = randomUUID();
    this.correlationId = correlationId;
    this.occurredAt = new Date().toISOString();
  }
}

/** A single line on an order. Shared by the order and inventory services. */
export interface OrderLineItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}
