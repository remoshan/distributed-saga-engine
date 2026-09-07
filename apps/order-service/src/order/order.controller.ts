import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // 202, not 201: the saga is asynchronous, so the outcome genuinely is not
  // known when this responds. The client polls statusUrl.
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.orders.createOrder(dto);

    return {
      orderId: order.id,
      correlationId: order.correlationId,
      status: order.status,
      statusUrl: `/orders/${order.id}`,
      message: 'Saga started. Poll statusUrl for the final outcome.',
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orders.findById(id);
  }
}
