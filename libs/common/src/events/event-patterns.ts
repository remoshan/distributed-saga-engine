export const SAGA_EVENTS = {
  ORDER_CREATED: 'order_created',
  INVENTORY_RESERVED: 'inventory_reserved',
  INVENTORY_FAILED: 'inventory_failed',
  INVENTORY_RELEASED: 'inventory_released',
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_FAILED: 'payment_failed',
} as const;

export type SagaEventPattern = (typeof SAGA_EVENTS)[keyof typeof SAGA_EVENTS];
