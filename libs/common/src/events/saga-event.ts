import { randomUUID } from 'node:crypto';

export interface SagaEventEnvelope {
  readonly eventId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

// Publish-side only. Events arrive at consumers as plain JSON, never as
// instances, so handlers must not use instanceof or call methods on them.
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

export interface OrderLineItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}
