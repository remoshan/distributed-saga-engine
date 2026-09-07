import { IdempotencyModule, SAGA_CLIENT, redisTransportOptions } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderController } from './order.controller';
import { OrderEventsController } from './order.events.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    IdempotencyModule,
    ClientsModule.registerAsync([
      {
        name: SAGA_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => redisTransportOptions(config),
      },
    ]),
  ],
  controllers: [OrderController, OrderEventsController],
  providers: [OrderService],
})
export class OrderModule {}
