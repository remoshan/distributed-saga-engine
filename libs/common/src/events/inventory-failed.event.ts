import { SagaEvent } from './saga-event';

/**
 * Emitted by inventory-service when stock is insufficient.
 *
 * This terminates the saga immediately: nothing was reserved, so there is
 * nothing to compensate. order-service cancels the order and no payment is
 * ever attempted.
 */
export class InventoryFailedEvent extends SagaEvent {
  readonly orderId: string;
  readonly reason: string;
  readonly productId: string | null;

  constructor(props: {
    correlationId: string;
    orderId: string;
    reason: string;
    productId?: string | null;
  }) {
    super(props.correlationId);
    this.orderId = props.orderId;
    this.reason = props.reason;
    this.productId = props.productId ?? null;
  }
}
