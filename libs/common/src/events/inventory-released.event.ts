import { OrderLineItem, SagaEvent } from './saga-event';

/**
 * The compensating event. Emitted by inventory-service after it has restored
 * stock that it previously deducted, in response to payment_failed.
 *
 * This is the heart of the saga pattern: there is no distributed rollback and
 * no lock held across services. The stock deduction was already committed, so
 * undoing it requires a second, forward-moving transaction that semantically
 * reverses the first.
 */
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
