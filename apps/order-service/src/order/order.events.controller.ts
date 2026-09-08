import {
  IdempotencyService,
  InventoryFailedEvent,
  PaymentFailedEvent,
  PaymentProcessedEvent,
  SAGA_EVENTS,
  SagaLogger,
} from '@app/common';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';

@Controller()
export class OrderEventsController {
  private static readonly CONSUMER = 'order-service';
  private readonly log = new SagaLogger('order-service');

  constructor(
    private readonly orders: OrderService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @EventPattern(SAGA_EVENTS.PAYMENT_PROCESSED)
  async onPaymentProcessed(
    @Payload() event: PaymentProcessedEvent,
  ): Promise<void> {
    this.log.received(SAGA_EVENTS.PAYMENT_PROCESSED, event, {
      orderId: event.orderId,
      amount: event.amount,
    });

    const executed = await this.idempotency.runOnce(
      OrderEventsController.CONSUMER,
      event.eventId,
      () => this.orders.markCompleted(event.orderId, event.correlationId),
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.PAYMENT_PROCESSED, event);
    }
  }

  // inventory-service consumes this same event to restore stock; neither
  // service knows the other is listening.
  @EventPattern(SAGA_EVENTS.PAYMENT_FAILED)
  async onPaymentFailed(@Payload() event: PaymentFailedEvent): Promise<void> {
    this.log.received(SAGA_EVENTS.PAYMENT_FAILED, event, {
      orderId: event.orderId,
      reason: event.reason,
    });

    const executed = await this.idempotency.runOnce(
      OrderEventsController.CONSUMER,
      event.eventId,
      () =>
        this.orders.markCancelled(
          event.orderId,
          `Payment failed: ${event.reason}`,
          event.correlationId,
        ),
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.PAYMENT_FAILED, event);
    }
  }

  @EventPattern(SAGA_EVENTS.INVENTORY_FAILED)
  async onInventoryFailed(
    @Payload() event: InventoryFailedEvent,
  ): Promise<void> {
    this.log.received(SAGA_EVENTS.INVENTORY_FAILED, event, {
      orderId: event.orderId,
      reason: event.reason,
    });

    const executed = await this.idempotency.runOnce(
      OrderEventsController.CONSUMER,
      event.eventId,
      () =>
        this.orders.markCancelled(
          event.orderId,
          `Inventory failed: ${event.reason}`,
          event.correlationId,
        ),
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.INVENTORY_FAILED, event);
    }
  }
}
