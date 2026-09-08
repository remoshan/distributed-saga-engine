import {
  IdempotencyModule,
  SAGA_CLIENT,
  redisTransportOptions,
} from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentEventsController } from './payment.events.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
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
  controllers: [PaymentEventsController],
  providers: [PaymentService],
})
export class PaymentModule {}
