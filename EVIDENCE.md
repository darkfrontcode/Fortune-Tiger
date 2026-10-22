# Quality Evidence Matrix

Last verified locally on **2026-10-22** with Docker Compose (`postgres:16`, `localstack:3`). Base git ref before audit fixes: `14ee0ef` (merge PR #35). Re-run the commands below after pulling audit fixes to refresh counts.

## Test Suite Results

### Unit Tests
- **Status**: PASS (local)
- **Count**: 297 tests across 52 files
- **Duration**: ~1s
- **Coverage**: Domain, application use cases, messaging adapters (no persistence integration)
- **Command**: `bun run test:unit`
- **Database**: Not required
- **Scope**: `bunfig.toml` root `./src` with ignores for `**/persistence/**` and presentation `*.e2e.test.ts`; `package.json` adds `--path-ignore-patterns` for the same

### Integration Tests
- **Status**: PASS (local)
- **Count**: 45 tests across 13 files
- **Duration**: ~10s
- **Coverage**: Persistence, inbox/outbox, crash recovery, reconciliation, reference retry, idempotency cross-wallet race, reversal flows
- **Command**: `bun run test:int`
- **Prerequisites**: `DATABASE_URL`, `AWS_ENDPOINT_URL`, `SQS_QUEUE_URL`, `SQS_DEAD_LETTER_QUEUE_URL` (LocalStack queues created in CI or compose)
- **Scope**: `bunfig.int.toml` → `src/infrastructure/persistence/tests`

### Concurrency Tests
- **Status**: PASS (local)
- **Count**: 3 tests in `races.test.ts`
- **Duration**: ~2–120s (spawns three app processes)
- **Command**: `bun run test:concurrency`
- **Prerequisites**: Same as integration

### E2E Tests
- **Status**: PASS (local)
- **Count**: 19 tests across 3 controller suites
- **Duration**: ~1–2s
- **Command**: `bun run test:e2e`
- **Scope**: `bunfig.e2e.toml` → `src/presentation/**/tests/*.e2e.test.ts` (mapper/filter unit files excluded via `package.json` ignore patterns)
- **Prerequisites**: `DATABASE_URL` and SQS env vars (full `AppModule` boots)

## PostgreSQL Constraints Audit

### Uniqueness Constraints
- `wallets_player_id_currency_unique` — one wallet per player per currency (`Migration20261021120000`)
- `wallet_ledger_entries_transaction_id_unique` — one ledger row per wager transaction (`Migration20261021120000`)
- `wager_transactions_idempotency_key_unique` — global idempotency key (`Migration20261021140000`)
- `wager_transactions_provider_external_unique` — provider + external id (`Migration20261021140000`)
- `inbox_messages` PK `(consumer_name, message_id)` (`Migration20261021150000`)

### Balance Integrity
- `wallets_balance_check` (`balance >= 0`)
- Ledger before/after checks and direction equation (`Migration20261021120000`)

### Ledger Immutability
- Unique `transaction_id` prevents duplicate inserts, not UPDATE/DELETE
- Application never updates or deletes ledger rows
- **Note**: immutability is application-enforced, not DB-permission-enforced

## Messaging and Recovery

### SQS consumer
- Long poll with visibility backoff on processing failures (`sqs.consumer.test.ts`)
- Receive failures backoff exponentially (cap 60s) instead of tight-loop polling (`messaging/spec.md`, `consumerBackoffSeconds` in `sqs.consumer.test.ts`)

### Outbox
- `FOR UPDATE SKIP LOCKED` concurrent publish (`outbox-publisher.test.ts`)
- Publish failure schedules retry (`outbox-publisher.test.ts`)
- Worker skips a tick while a batch is still publishing (`outbox.worker.test.ts`)
- End-to-end crash/restart with real SQS publish (`crashes.test.ts` tests 3, 5, 6)

### Idempotency
- Same key, same payload: replay (`idempotencies/spec.md`, `races.test.ts`)
- Same key, different payload: `IDEMPOTENCY_PAYLOAD_CONFLICT` (`idempotency-race.test.ts`, wager e2e)
- Unique constraint race across wallets: one row, conflict response (`idempotency-race.test.ts`, `WagerSubmitWriter` in `persistence/spec.md`)

### Reversal flows (integration)
- BET → ROLLBACK → WIN on bet: `REFERENCE_ALREADY_REVERSED` (`wager-reversal-flow.test.ts`)
- BET → WIN → ROLLBACK on win: debits win (`wager-reversal-flow.test.ts`)
- Double REFUND on same bet: second rejected (`wager-reversal-flow.test.ts`)
- Concurrent rollbacks on same bet: one processed, one rejected (`wager-reversal-flow.test.ts`)
- Optional WIN with reversed reference: `REFERENCE_ALREADY_REVERSED` (`wager.mediator.test.ts`)

## HTTP E2E Coverage

Wallet, wager, and health controllers: validation, idempotency conflict, pagination, reconciliation, readiness (`src/presentation/**/tests/*.e2e.test.ts`).

## CI Configuration

- Bun **1.4.3** pinned in `.github/workflows/ci.yml`
- PostgreSQL 16 + LocalStack 3 services with health checks
- Env: `DATABASE_URL`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_QUEUE_URL`, `SQS_DEAD_LETTER_QUEUE_URL`
- FIFO queues created before migrations/tests
- Pipeline: `test:unit` → `test:int` → `test:concurrency` → `test:e2e`

## Delivery Guarantees (honest)

- SQS + inbox/outbox provide **at-least-once** delivery; effects are deduplicated via inbox and idempotency constraints, not exactly-once end-to-end
- Outbox publish can duplicate on crash after send; consumer inbox prevents double financial effect
- Ledger uniqueness does not make the table immutable without application discipline

## Out of Scope

- Audit store, Keycloak, OpenTelemetry, load tests (per project `AGENTS.md`)
