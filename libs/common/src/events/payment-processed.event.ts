import { SagaEvent } from './saga-event';

export class PaymentProcessedEvent extends SagaEvent {
  readonly orderId: string;
  readonly paymentId: string;
  readonly amount: number;

  constructor(props: {
    correlationId: string;
    orderId: string;
    paymentId: string;
    amount: number;
  }) {
    super(props.correlationId);
    this.orderId = props.orderId;
    this.paymentId = props.paymentId;
    this.amount = props.amount;
  }
}
