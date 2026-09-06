import { SagaEvent } from './saga-event';

/** Emitted by payment-service when the charge succeeds. Completes the saga. */
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
