import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('stock_items')
export class StockItem {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
