/**
 * The complete set of message patterns exchanged across the saga.
 *
 * These strings are the Redis Pub/Sub channel names. Every service imports
 * them from here, so a publisher and a consumer can never drift apart by a
 * typo — a misspelled channel is a compile error rather than an event that
 * silently vanishes into a channel nobody subscribes to.
 */
export const SAGA_EVENTS = {
  ORDER_CREATED: 'order_created',
  INVENTORY_RESERVED: 'inventory_reserved',
  INVENTORY_FAILED: 'inventory_failed',
  INVENTORY_RELEASED: 'inventory_released',
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_FAILED: 'payment_failed',
} as const;

export type SagaEventPattern = (typeof SAGA_EVENTS)[keyof typeof SAGA_EVENTS];
