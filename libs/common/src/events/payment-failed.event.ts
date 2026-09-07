import { OrderLineItem, SagaEvent } from './saga-event';

export class PaymentFailedEvent extends SagaEvent {
  readonly orderId: string;
  readonly reason: string;
  // Echoed back so inventory-service can compensate without querying order_db.
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
