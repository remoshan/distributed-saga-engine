# distributed-saga-engine

Event-driven microservices demonstrating the **Choreographed Saga pattern** — distributed
transactions and compensating rollbacks across three services with no central
orchestrator and no cross-service database locks.

## Architecture

```
                    Redis Pub/Sub
                          |
  order-service      inventory-service      payment-service
   (HTTP :3000)        (consumer)             (consumer)
        |                   |                      |
    order_db          inventory_db            payment_db
```

Each service owns its own logical database and can only reach its own. Services
communicate solely by publishing and consuming events.

### Saga flow

| Step | Service | Consumes | Emits |
|------|---------|----------|-------|
| 1 | order-service | `POST /orders` | `order_created` |
| 2 | inventory-service | `order_created` | `inventory_reserved` or `inventory_failed` |
| 3 | payment-service | `inventory_reserved` | `payment_processed` or `payment_failed` |
| 4 | order-service | `payment_processed` | order → `COMPLETED` |
| 4' | order-service | `payment_failed` / `inventory_failed` | order → `CANCELLED` |
| 4' | inventory-service | `payment_failed` | restores stock, emits `inventory_released` |

`payment_failed` fans out to two independent consumers — neither knows the other
exists. That mutual ignorance is what makes this choreography rather than
orchestration.

## Stack

NestJS 11 (CommonJS) · TypeScript · Redis Pub/Sub via `@nestjs/microservices` ·
PostgreSQL + TypeORM · Docker Compose

## Setup

```bash
docker compose up -d     # postgres :5433, redis :6379
npm install
```

Configuration lives in a single `.env` at the repo root (gitignored). Required keys:

```
POSTGRES_HOST POSTGRES_PORT POSTGRES_USER POSTGRES_PASSWORD
ORDER_DB_NAME INVENTORY_DB_NAME PAYMENT_DB_NAME
TYPEORM_SYNCHRONIZE TYPEORM_LOGGING
REDIS_HOST REDIS_PORT
IDEMPOTENCY_TTL_SECONDS PAYMENT_SIMULATE_FAILURE
ORDER_SERVICE_HTTP_PORT
```

## Run

Three terminals:

```bash
npm run start:order
npm run start:inventory
npm run start:payment
```

## Design notes

**Correlation IDs** — minted once when an order is placed and copied onto every
downstream event, so one saga is traceable across three service logs by a single value.

**Idempotency** — every consumed event is claimed in Redis with `SET NX EX` before its
handler runs. Keys are scoped per consumer (`saga:idempotency:{service}:{eventId}`)
because one event may legitimately be handled by two different services.

**Semantic lock** — `OrderStatus.PENDING` marks a row as in-flight. Sagas give up ACID
isolation; this is the countermeasure that stops a reader treating an unsettled order
as final.

**Known gap: dual write.** A service commits its state change and publishes its event as
two separate operations. A crash between them strands the saga. The fix is the
Transactional Outbox pattern — marked `KNOWN GAP` in `order.service.ts`.

## Verification

Start the infrastructure and all three services, then run the scenarios below.
UUIDs in the sample output are shortened for readability.

```bash
docker compose up -d
npm run start:order       # terminal 1
npm run start:inventory   # terminal 2
npm run start:payment     # terminal 3
```

Stock is seeded on first boot: `SKU-LAPTOP` 10, `SKU-MOUSE` 100, `SKU-KEYBOARD` 50,
`SKU-DESK` 5, `SKU-CHAIR` 3.

### 1. Happy path

Requires `PAYMENT_SIMULATE_FAILURE=false` in `.env`.

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-001","items":[{"productId":"SKU-LAPTOP","quantity":2,"unitPrice":899.50},{"productId":"SKU-MOUSE","quantity":1,"unitPrice":25.00}]}'
```

`202 Accepted` — the saga has started, the outcome is not known yet:

```json
{
  "orderId": "2d2618c6-...",
  "correlationId": "700da01e-...",
  "status": "PENDING",
  "statusUrl": "/orders/2d2618c6-...",
  "message": "Saga started. Poll statusUrl for the final outcome."
}
```

Console output across the three services:

```
[order-service]     STATE     Order(2d2618c6) NEW -> PENDING
[order-service]     PUBLISH   order_created        totalAmount=1824
[inventory-service] RECEIVE   order_created
[inventory-service] PUBLISH   inventory_reserved
[payment-service]   RECEIVE   inventory_reserved   amount=1824
[payment-service]   PUBLISH   payment_processed    paymentId=5208e617
[order-service]     RECEIVE   payment_processed    amount=1824
[order-service]     STATE     Order(2d2618c6) PENDING -> COMPLETED
```

Poll the outcome:

```bash
curl http://localhost:3000/orders/<orderId>
```

```json
{ "status": "COMPLETED", "totalAmount": 1824, "failureReason": null }
```

Stock drops from 10 → 8 (`SKU-LAPTOP`) and 100 → 99 (`SKU-MOUSE`); the `payments` row
is `SUCCEEDED`.

### 2. Compensating path — payment declined

Set `PAYMENT_SIMULATE_FAILURE=true` in `.env` and restart payment-service only.
It logs its mode on boot:

```
[Bootstrap] payment-service subscribed to Redis Pub/Sub (simulate failure: true)
```

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-002","items":[{"productId":"SKU-LAPTOP","quantity":2,"unitPrice":899.50}]}'
```

```
[order-service]     STATE      Order(55638586) NEW -> PENDING
[order-service]     PUBLISH    order_created        totalAmount=1799
[inventory-service] RECEIVE    order_created
[inventory-service] PUBLISH    inventory_reserved                     stock 8 -> 6
[payment-service]   RECEIVE    inventory_reserved   amount=1799
[payment-service]   REJECT     card declined by issuer (simulated)
[payment-service]   PUBLISH    payment_failed
[order-service]     RECEIVE    payment_failed
[order-service]     STATE      Order(55638586) PENDING -> CANCELLED
[inventory-service] COMPENSATE payment_failed
[inventory-service] PUBLISH    inventory_released                     stock 6 -> 8
```

```json
{
  "status": "CANCELLED",
  "failureReason": "Payment failed: card declined by issuer (simulated)"
}
```

Stock returns to 8 — deducted, then restored by the compensating transaction. The
`payments` row is `DECLINED`.

Note `payment_failed` is consumed by **two** services independently. order-service
cancels the order; inventory-service restores stock. Neither knows the other is
listening.

### 3. Short-circuit path — insufficient stock

`SKU-CHAIR` has 3 in stock:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-003","items":[{"productId":"SKU-CHAIR","quantity":5,"unitPrice":80.00}]}'
```

```
[order-service]     STATE     Order(139c0974) NEW -> PENDING
[order-service]     PUBLISH   order_created        totalAmount=400
[inventory-service] RECEIVE   order_created
[inventory-service] REJECT    insufficient stock for SKU-CHAIR: have 3, need 5
[inventory-service] PUBLISH   inventory_failed
[order-service]     RECEIVE   inventory_failed
[order-service]     STATE     Order(139c0974) PENDING -> CANCELLED
```

```json
{
  "status": "CANCELLED",
  "failureReason": "Inventory failed: insufficient stock for SKU-CHAIR: have 3, need 5"
}
```

No stock was reserved and no payment row is created — there is nothing to compensate,
so the saga simply ends.

### 4. Idempotency

Replay a consumed event by publishing it again with the same `eventId`:

```bash
docker exec saga_redis redis-cli publish payment_processed \
  '{"pattern":"payment_processed","data":{"eventId":"evt-001","correlationId":"<corr>","occurredAt":"2026-01-01T00:00:00.000Z","orderId":"<orderId>","paymentId":"p1","amount":1824}}'
```

The first delivery transitions the order. The second is suppressed:

```
[order-service] RECEIVE   payment_processed
[order-service] DUPLICATE payment_processed  action=skipped, state unchanged
```

Keys are scoped per consumer, so one event replayed produces one key per service:

```bash
docker exec saga_redis redis-cli keys "saga:idempotency:*"
# saga:idempotency:order-service:evt-001
# saga:idempotency:inventory-service:evt-001
```

### Inspecting state

```bash
docker exec saga_postgres psql -U saga -d order_db     -c "SELECT id, status, \"failureReason\" FROM orders"
docker exec saga_postgres psql -U saga -d inventory_db -c "SELECT * FROM stock_items ORDER BY 1"
docker exec saga_postgres psql -U saga -d payment_db   -c "SELECT \"orderId\", amount, status FROM payments"
```

Database isolation holds — each table exists in exactly one database:

```bash
docker exec saga_postgres psql -U saga -d inventory_db -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_name='orders'"   # 0
```
