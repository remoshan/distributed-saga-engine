import {
  IdempotencyService,
  InventoryReservedEvent,
  PaymentFailedEvent,
  PaymentProcessedEvent,
  SAGA_CLIENT,
  SAGA_EVENTS,
  SagaLogger,
} from '@app/common';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { PaymentStatus } from './payment.entity';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentEventsController {
  private static readonly CONSUMER = 'payment-service';
  private readonly log = new SagaLogger('payment-service');

  constructor(
    private readonly payments: PaymentService,
    private readonly idempotency: IdempotencyService,
    @Inject(SAGA_CLIENT) private readonly client: ClientProxy,
  ) {}

  @EventPattern(SAGA_EVENTS.INVENTORY_RESERVED)
  async onInventoryReserved(
    @Payload() event: InventoryReservedEvent,
  ): Promise<void> {
    this.log.received(SAGA_EVENTS.INVENTORY_RESERVED, event, {
      orderId: event.orderId,
      amount: event.totalAmount,
    });

    const executed = await this.idempotency.runOnce(
      PaymentEventsController.CONSUMER,
      event.eventId,
      async () => {
        const payment = await this.payments.charge({
          orderId: event.orderId,
          customerId: event.customerId,
          amount: event.totalAmount,
          correlationId: event.correlationId,
        });

        if (payment.status === PaymentStatus.SUCCEEDED) {
          const processed = new PaymentProcessedEvent({
            correlationId: event.correlationId,
            orderId: event.orderId,
            paymentId: payment.id,
            amount: payment.amount,
          });
          this.client.emit(SAGA_EVENTS.PAYMENT_PROCESSED, processed);
          this.log.published(SAGA_EVENTS.PAYMENT_PROCESSED, processed, {
            orderId: event.orderId,
            paymentId: payment.id,
          });
          return;
        }

        this.log.rejected(
          payment.failureReason ?? 'declined',
          event.correlationId,
          {
            orderId: event.orderId,
          },
        );

        // items are echoed so inventory-service can compensate without
        // reaching into another service's database.
        const failed = new PaymentFailedEvent({
          correlationId: event.correlationId,
          orderId: event.orderId,
          reason: payment.failureReason ?? 'declined',
          items: event.items,
        });
        this.client.emit(SAGA_EVENTS.PAYMENT_FAILED, failed);
        this.log.published(SAGA_EVENTS.PAYMENT_FAILED, failed, {
          orderId: event.orderId,
        });
      },
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.INVENTORY_RESERVED, event);
    }
  }
}
