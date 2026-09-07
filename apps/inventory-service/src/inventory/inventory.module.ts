import { IdempotencyModule, SAGA_CLIENT, redisTransportOptions } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryEventsController } from './inventory.events.controller';
import { InventoryService } from './inventory.service';
import { StockItem } from './stock-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockItem]),
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
  controllers: [InventoryEventsController],
  providers: [InventoryService],
})
export class InventoryModule {}
