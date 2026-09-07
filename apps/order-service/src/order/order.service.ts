import { randomUUID } from 'node:crypto';
import {
  OrderCreatedEvent,
  SAGA_CLIENT,
  SAGA_EVENTS,
  SagaLogger,
} from '@app/common';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrderService {
  private readonly log = new SagaLogger('order-service');

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @Inject(SAGA_CLIENT) private readonly client: ClientProxy,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Minted once here; every downstream event copies it unchanged.
    const correlationId = randomUUID();
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const order = await this.orders.save(
      this.orders.create({
        customerId: dto.customerId,
        items: dto.items,
        totalAmount,
        status: OrderStatus.PENDING,
        correlationId,
        failureReason: null,
      }),
    );

    this.log.stateChanged('Order', order.id, 'NEW', OrderStatus.PENDING, correlationId);

    const event = new OrderCreatedEvent({
      correlationId,
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmount: order.totalAmount,
    });

    // KNOWN GAP - dual write. The commit above and this publish share no
    // transaction; a crash between them strands the order in PENDING forever.
    // Fix is a Transactional Outbox.
    this.client.emit(SAGA_EVENTS.ORDER_CREATED, event);
    this.log.published(SAGA_EVENTS.ORDER_CREATED, event, {
      orderId: order.id,
      totalAmount,
    });

    return order;
  }

  async findById(id: string): Promise<Order> {
    if (!id) {
      throw new NotFoundException('Order id is required');
    }
    const order = await this.orders.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async markCompleted(orderId: string, correlationId: string): Promise<void> {
    await this.transition(orderId, OrderStatus.COMPLETED, null, correlationId);
  }

  async markCancelled(
    orderId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    await this.transition(orderId, OrderStatus.CANCELLED, reason, correlationId);
  }

  private async transition(
    orderId: string,
    next: OrderStatus,
    failureReason: string | null,
    correlationId: string,
  ): Promise<void> {
    // TypeORM treats `where: { id: undefined }` as no condition and returns an
    // arbitrary row, so a malformed event must be rejected before the query.
    if (!orderId) {
      this.log.rejected(
        'event carried no orderId, refusing to transition',
        correlationId,
        { attemptedStatus: next },
      );
      return;
    }

    const order = await this.orders.findOne({ where: { id: orderId } });

    if (!order) {
      this.log.rejected(`order ${orderId} not found, ignoring`, correlationId);
      return;
    }

    // Guards against two *different* terminal events racing for one order,
    // which the idempotency guard does not cover.
    if (order.status !== OrderStatus.PENDING) {
      this.log.rejected(
        `order ${orderId} already ${order.status}, refusing transition to ${next}`,
        correlationId,
      );
      return;
    }

    order.status = next;
    order.failureReason = failureReason;
    await this.orders.save(order);

    this.log.stateChanged(
      'Order',
      order.id,
      OrderStatus.PENDING,
      next,
      correlationId,
    );
  }
}
