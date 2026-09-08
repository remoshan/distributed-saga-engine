import { join } from 'node:path';
import { postgresOptions } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment/payment.entity';
import { PaymentModule } from './payment/payment.module';

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
        postgresOptions(config, config.getOrThrow<string>('PAYMENT_DB_NAME'), [
          Payment,
        ]),
    }),
    PaymentModule,
  ],
})
export class AppModule {}
