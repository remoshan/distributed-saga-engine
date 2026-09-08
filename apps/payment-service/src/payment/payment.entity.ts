import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PaymentStatus {
  SUCCEEDED = 'SUCCEEDED',
  DECLINED = 'DECLINED',
}

const numericTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number => (value === null ? 0 : Number(value)),
};

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  orderId: string;

  @Column({ type: 'varchar', length: 128 })
  customerId: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  correlationId: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
