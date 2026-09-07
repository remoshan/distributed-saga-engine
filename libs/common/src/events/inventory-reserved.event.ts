import { OrderLineItem, SagaEvent } from './saga-event';

export class InventoryReservedEvent extends SagaEvent {
  readonly orderId: string;
  readonly customerId: string;
  readonly items: OrderLineItem[];
  readonly totalAmount: number;

  constructor(props: {
    correlationId: string;
    orderId: string;
    customerId: string;
    items: OrderLineItem[];
    totalAmount: number;
  }) {
    super(props.correlationId);
    this.orderId = props.orderId;
    this.customerId = props.customerId;
    this.items = props.items;
    this.totalAmount = props.totalAmount;
  }
}
