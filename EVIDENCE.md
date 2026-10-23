# Quality Evidence Matrix

Last verified locally on **2026-10-22** with Docker Compose (`postgres:16`, `localstack:3`). Base git ref: `1a40474` (merge PR #42), with the working tree of `docs/docs/delivery-polish`. `bun run verify:full` and `bun run demo` were re-run on it. The load numbers below come from the measured run described in their own section.

## Test Suite Results

### Unit Tests
- **Status**: PASS (local)
- **Count**: 328 tests across 57 files
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
- **Duration**: ~3s (spawns three app processes)
- **Command**: `bun run test:concurrency`
- **Prerequisites**: Same as integration

### E2E Tests
- **Status**: PASS (local)
- **Count**: 42 tests across 7 suites
- **Duration**: ~2s
- **Command**: `bun run test:e2e`
- **Scope**: `bunfig.e2e.toml` → `src/presentation/**/tests/*.e2e.test.ts` (mapper/filter unit files excluded via `package.json` ignore patterns)
- **Prerequisites**: `DATABASE_URL` and SQS env vars (full `AppModule` boots)

### Container
- **Status**: PASS (local)
- **Command**: `docker compose --profile app up -d --build`
- **Coverage**: builds the root `Dockerfile`, applies the migrations in a one-shot `migrate` service, and starts the API with its workers; `docker compose --profile app ps` reports `app` healthy, `GET /health/ready` answers `{"status":"ready"}`, and `GET /docs-json` answers `200`
- **Prerequisites**: Docker Compose v2 and the same `postgres:16` and `localstack:3` services; the image contract is in [`docker/spec.md`](docker/spec.md)

### Demo
- **Status**: PASS (local)
- **Command**: `bun run demo`
- **Duration**: ~3s
- **Coverage**: boots the app on a free port and asserts liveness, readiness, wallet `201`, `BET` `200` with balance `70.00`, replay with `idempotentReplay: true` and the same transaction, `LOSS` without a balance change, two ledger entries in order, reconciliation `consistent: true` with `difference 0.00`, and the processed and duplicate counters in `/metrics`
- **Prerequisites**: same stack as integration; scripts are specified in `scripts/spec.md`

### Load
- **Status**: PASS (local)
- **Command**: `bun run test:load`
- **Coverage**: two measured waves against a running API — 50 distinct wallets and 50 bets on one hot wallet, 25 requests in flight. Default run: `43.5 req/s` and p95 `762 ms` on distinct wallets; `22.4 req/s` and p95 `1325 ms` on the hot wallet; zero HTTP errors. Every wallet ended at the expected balance, reconciliation was consistent, the processed counter grew by 100, and the duplicate counter stayed at zero
- **Prerequisites**: `docker compose up -d`, `bun run migration:up`, and `bun run start`; the method and the limits are in [`docs/load.md`](docs/load.md)

## Delivery Docs

- `docs/API.md` — routes, headers, status table, error bodies, failure codes, queue events
- `docs/DELIVERY.md` — reviewer path: commands, expected output, reading map, limits
- `requests.http` — the same happy path by hand, plus conflict, rejection, and not-found cases
- `docs/testing.md` — what each suite covers
- `docs/load.md` — the load method, the two waves, the results, and the limits
- `scripts/spec.md` — `verify`, `verify:full`, `demo`, and `load` behavior

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

Wallet, wager, health, and Swagger suites: validation, idempotency conflict, pagination, reconciliation, readiness, the OpenAPI document, and the UI (`src/presentation/**/tests/*.e2e.test.ts`).

## OpenAPI

- `GET /docs` serves the Swagger UI; `GET /docs-json` serves the OpenAPI 3 document
- `SwaggerFactory` (`src/presentation/http/factories/swagger.factory.ts`) builds it from the DTOs and the controller decorators
- The health and metrics controllers carry `@ApiExcludeController`, so the document keeps the provider routes only
- The `swagger.e2e.test.ts` suite checks the provider paths, the request and response schemas, the required `Idempotency-Key` header, and the UI response

## Observability

- `GET /metrics` answers the Prometheus text exposition, scraped from the process that serves the request
- `PrometheusMetric` (`prom-client`) is the default adapter; `SimpleMetric` runs under `METRICS_BACKEND=memory`
- Names live in `application/observability/data/metric-names.data.ts`; the help text lives in `maps/metric-description.map.ts`
- Instrumented: transactions by status and processing time (`SubmitWagerUseCase`), duplicates (replay counted by the same use case), retries and dead letters (`SqsConsumer`), lock conflicts (`WagerSubmitWriter`), outbox lag (`OutboxPublisher`), divergence (`ReconcileWalletUseCase`)
- `prometheus.metric.test.ts` and `simple.metric.test.ts` cover the exposition; the health e2e suite covers the route

## CI Configuration

- Bun **1.4.3** pinned in `.github/workflows/ci.yml`
- PostgreSQL 16 + LocalStack 3 services with health checks
- Env: `DATABASE_URL`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_QUEUE_URL`, `SQS_DEAD_LETTER_QUEUE_URL`
- FIFO queues created before migrations/tests
- Pipeline: `bun run build` → `test:unit` → `test:int` → `test:concurrency` → `test:e2e`

## Delivery Guarantees (honest)

- SQS + inbox/outbox provide **at-least-once** delivery; effects are deduplicated via inbox and idempotency constraints, not exactly-once end-to-end
- Outbox publish can duplicate on crash after send; consumer inbox prevents double financial effect
- Ledger uniqueness does not make the table immutable without application discipline

## Out of Scope

Out of scope: an audit store, OpenTelemetry, double-entry accounting, and partial reversal. In scope: the Prometheus exposition, the optional Keycloak `auth` profile, and the local load measurement.
