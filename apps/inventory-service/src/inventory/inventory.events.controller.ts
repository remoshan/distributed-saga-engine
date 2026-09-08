import {
  IdempotencyService,
  InventoryFailedEvent,
  InventoryReleasedEvent,
  InventoryReservedEvent,
  OrderCreatedEvent,
  PaymentFailedEvent,
  SAGA_CLIENT,
  SAGA_EVENTS,
  SagaLogger,
} from '@app/common';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryEventsController {
  private static readonly CONSUMER = 'inventory-service';
  private readonly log = new SagaLogger('inventory-service');

  constructor(
    private readonly inventory: InventoryService,
    private readonly idempotency: IdempotencyService,
    @Inject(SAGA_CLIENT) private readonly client: ClientProxy,
  ) {}

  @EventPattern(SAGA_EVENTS.ORDER_CREATED)
  async onOrderCreated(@Payload() event: OrderCreatedEvent): Promise<void> {
    this.log.received(SAGA_EVENTS.ORDER_CREATED, event, {
      orderId: event.orderId,
    });

    const executed = await this.idempotency.runOnce(
      InventoryEventsController.CONSUMER,
      event.eventId,
      async () => {
        const result = await this.inventory.reserve(event.items);

        if (result.ok) {
          const reserved = new InventoryReservedEvent({
            correlationId: event.correlationId,
            orderId: event.orderId,
            customerId: event.customerId,
            items: event.items,
            totalAmount: event.totalAmount,
          });
          this.client.emit(SAGA_EVENTS.INVENTORY_RESERVED, reserved);
          this.log.published(SAGA_EVENTS.INVENTORY_RESERVED, reserved, {
            orderId: event.orderId,
          });
          return;
        }

        this.log.rejected(result.reason, event.correlationId, {
          orderId: event.orderId,
        });
        const failed = new InventoryFailedEvent({
          correlationId: event.correlationId,
          orderId: event.orderId,
          reason: result.reason,
          productId: result.productId,
        });
        this.client.emit(SAGA_EVENTS.INVENTORY_FAILED, failed);
        this.log.published(SAGA_EVENTS.INVENTORY_FAILED, failed, {
          orderId: event.orderId,
        });
      },
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.ORDER_CREATED, event);
    }
  }

  @EventPattern(SAGA_EVENTS.PAYMENT_FAILED)
  async onPaymentFailed(@Payload() event: PaymentFailedEvent): Promise<void> {
    this.log.compensating(SAGA_EVENTS.PAYMENT_FAILED, event, {
      orderId: event.orderId,
      reason: event.reason,
    });

    const executed = await this.idempotency.runOnce(
      InventoryEventsController.CONSUMER,
      event.eventId,
      async () => {
        if (!event.items?.length) {
          this.log.rejected(
            'payment_failed carried no items to restore',
            event.correlationId,
          );
          return;
        }

        await this.inventory.release(event.items);

        const released = new InventoryReleasedEvent({
          correlationId: event.correlationId,
          orderId: event.orderId,
          items: event.items,
        });
        this.client.emit(SAGA_EVENTS.INVENTORY_RELEASED, released);
        this.log.published(SAGA_EVENTS.INVENTORY_RELEASED, released, {
          orderId: event.orderId,
        });
      },
    );

    if (!executed) {
      this.log.skipped(SAGA_EVENTS.PAYMENT_FAILED, event);
    }
  }
}
