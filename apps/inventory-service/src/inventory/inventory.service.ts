import { OrderLineItem } from '@app/common';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StockItem } from './stock-item.entity';

const SEED: ReadonlyArray<[string, number]> = [
  ['SKU-LAPTOP', 10],
  ['SKU-MOUSE', 100],
  ['SKU-KEYBOARD', 50],
  ['SKU-DESK', 5],
  ['SKU-CHAIR', 3],
];

export type ReserveResult =
  { ok: true } | { ok: false; reason: string; productId: string };

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onModuleInit(): Promise<void> {
    const repo = this.db.getRepository(StockItem);
    if ((await repo.count()) > 0) {
      return;
    }
    await repo.save(
      SEED.map(([productId, quantity]) => repo.create({ productId, quantity })),
    );
    this.logger.log(`seeded ${SEED.length} stock items`);
  }

  async reserve(items: OrderLineItem[]): Promise<ReserveResult> {
    return this.db.transaction(async (manager) => {
      for (const item of this.inLockOrder(items)) {
        const stock = await manager.findOne(StockItem, {
          where: { productId: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!stock) {
          return {
            ok: false,
            reason: `unknown product ${item.productId}`,
            productId: item.productId,
          };
        }
        if (stock.quantity < item.quantity) {
          return {
            ok: false,
            reason: `insufficient stock for ${item.productId}: have ${stock.quantity}, need ${item.quantity}`,
            productId: item.productId,
          };
        }

        stock.quantity -= item.quantity;
        await manager.save(stock);
      }
      return { ok: true };
    });
  }

  async release(items: OrderLineItem[]): Promise<void> {
    await this.db.transaction(async (manager) => {
      for (const item of this.inLockOrder(items)) {
        await manager.increment(
          StockItem,
          { productId: item.productId },
          'quantity',
          item.quantity,
        );
      }
    });
  }

  // Consistent lock ordering: two concurrent sagas touching the same SKUs in
  // different order would otherwise deadlock.
  private inLockOrder(items: OrderLineItem[]): OrderLineItem[] {
    return [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  }
}
