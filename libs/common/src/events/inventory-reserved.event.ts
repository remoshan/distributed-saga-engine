import { OrderLineItem, SagaEvent } from './saga-event';

/** Emitted by inventory-service after stock has been deducted successfully. */
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
