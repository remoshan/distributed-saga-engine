import { OrderLineItem, SagaEvent } from './saga-event';

/**
 * Emitted by payment-service when the charge is declined.
 *
 * Two services react to this event, which is what makes the saga
 * choreographed rather than orchestrated: order-service cancels the order,
 * and inventory-service independently compensates by restoring stock. Neither
 * knows the other is listening.
 *
 * `items` is echoed back here so inventory-service can restore the exact
 * quantities without querying another service's database.
 */
export class PaymentFailedEvent extends SagaEvent {
  readonly orderId: string;
  readonly reason: string;
  readonly items: OrderLineItem[];

  constructor(props: {
    correlationId: string;
    orderId: string;
    reason: string;
    items: OrderLineItem[];
  }) {
    super(props.correlationId);
    this.orderId = props.orderId;
    this.reason = props.reason;
    this.items = props.items;
  }
}
