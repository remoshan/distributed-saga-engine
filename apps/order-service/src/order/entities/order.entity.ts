import { OrderLineItem } from '@app/common';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  // Semantic lock: the row is committed and visible, but marked in-flight so
  // nothing mistakes it for a settled order while the saga runs.
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Postgres numeric arrives as a string.
const numericTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number => (value === null ? 0 : Number(value)),
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  customerId: string;

  @Column({ type: 'jsonb' })
  items: OrderLineItem[];

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  correlationId: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
