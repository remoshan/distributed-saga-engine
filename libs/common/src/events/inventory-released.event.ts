import { OrderLineItem, SagaEvent } from './saga-event';

export class InventoryReleasedEvent extends SagaEvent {
  readonly orderId: string;
  readonly items: OrderLineItem[];

  constructor(props: {
    correlationId: string;
    orderId: string;
    items: OrderLineItem[];
  }) {
    super(props.correlationId);
    this.orderId = props.orderId;
    this.items = props.items;
  }
}
