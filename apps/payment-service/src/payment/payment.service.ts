import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';

const DECLINE_REASON = 'card declined by issuer (simulated)';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly config: ConfigService,
  ) {}

  async charge(input: {
    orderId: string;
    customerId: string;
    amount: number;
    correlationId: string;
  }): Promise<Payment> {
    const declined =
      this.config.get<string>('PAYMENT_SIMULATE_FAILURE') === 'true';

    return this.payments.save(
      this.payments.create({
        ...input,
        status: declined ? PaymentStatus.DECLINED : PaymentStatus.SUCCEEDED,
        failureReason: declined ? DECLINE_REASON : null,
      }),
    );
  }
}
