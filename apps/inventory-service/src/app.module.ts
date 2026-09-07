import { join } from 'node:path';
import { postgresOptions } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from './inventory/inventory.module';
import { StockItem } from './inventory/stock-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        postgresOptions(config, config.getOrThrow<string>('INVENTORY_DB_NAME'), [StockItem]),
    }),
    InventoryModule,
  ],
})
export class AppModule {}
