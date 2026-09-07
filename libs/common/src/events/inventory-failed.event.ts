import { SagaEvent } from './saga-event';

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
