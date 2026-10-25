# Quality Evidence Matrix

The current branch was verified locally with Docker Compose (`postgres:16`, `localstack:3`) on **2026-10-23**. `bun run verify:full` passed the complete gate, including migrations, unit tests, persistence integration, six-process concurrency tests, and HTTP end-to-end tests. The load numbers below come from the measured full-stack run described in their own section.

## Test Suite Results

### Lint
- **Status**: PASS (local)
- **Command**: `bun run lint`
- **Scope**: Biome 2.6 over every source file; the rule set and the four documented exceptions are in [`docs/testing.md`](docs/testing.md)
- **Prerequisites**: none; `bun run verify` runs it before the type-check

### Coverage
- **Status**: PASS (local)
- **Command**: `bun run test:coverage`
- **Functions**: 92.45% (Bun counts implicit class constructors in this metric)
- **Lines**: 100%
- **Report**: `coverage/lcov.info`, kept by the pipeline as an artifact
- **Scope**: the unit suite; persistence and HTTP end-to-end paths need PostgreSQL and SQS, so they are measured by `verify:full` and stay out of this number

### Unit Tests
- **Status**: PASS (local)
- **Count**: 367 tests across 66 files
- **Duration**: ~1s
- **Coverage**: Domain, application use cases, messaging adapters (no persistence integration), plus `fast-check` properties for money arithmetic, wallet balance, ledger equation, idempotency digest, and wager transitions; 100% of executable unit-scope lines are covered
- **Command**: `bun run test:unit`
- **Database**: Not required
- **Scope**: `bunfig.toml` root `./src` with ignores for `**/persistence/**` and presentation `*.e2e.test.ts`; `package.json` adds `--path-ignore-patterns` for the same

### Integration Tests
- **Status**: PASS (local)
- **Count**: 51 tests across 15 files
- **Duration**: ~22s
- **Coverage**: Persistence, inbox/outbox, crash recovery, reconciliation, reference retry, idempotency cross-wallet race, reversal flows, database outage and recovery
- **Command**: `bun run test:int`
- **Prerequisites**: `DATABASE_URL`, `AWS_ENDPOINT_URL`, `SQS_QUEUE_URL`, `SQS_DEAD_LETTER_QUEUE_URL`, `SQS_EVENTS_QUEUE_URL` (LocalStack queues created in CI or compose)
- **Scope**: `bunfig.int.toml` → `src/infrastructure/persistence/tests`

### Concurrency Tests
- **Status**: PASS (local)
- **Count**: 6 tests in `races.test.ts`
- **Duration**: ~7s (spawns six app processes)
- **Command**: `bun run test:concurrency`
- **Coverage**: one debit under 50 parallel duplicates, a balance race, independent wallets, a duplicate storm with a conflicting payload, two rollbacks of one bet, and a process that stops with a request in flight
- **Prerequisites**: Same as integration

### Fault Injection
- **Status**: PASS (local)
- **Count**: 1 test in `outage.test.ts`
- **Coverage**: a TCP proxy in front of PostgreSQL; readiness and a submit answer `503` while the database is unreachable, and both recover to `200` after the proxy returns, with no application restart
- **Command**: `bun run test:int`
- **Prerequisites**: Same as integration

### Dashboards
- **Status**: PASS (local)
- **Command**: `docker compose --profile app --profile observability up -d`
- **Coverage**: Prometheus 2.55 and Grafana 11.2 start beside the API; the `fortune-tiger` scrape target reports `up` on `http://app:3000/metrics`, Grafana answers `/api/health` with `database: ok`, the datasource `Prometheus` and the dashboard `Fortune Tiger` (uid `fortune-tiger`, four panels) are provisioned from `docker/grafana/`, and a wallet plus a `BET` moved `wager_transactions_processed_total` to `1` as scraped by Prometheus
- **Prerequisites**: the `app` profile, so a target has something to scrape; the profile contract is in [`docker/spec.md`](docker/spec.md)

### E2E Tests
- **Status**: PASS (local)
- **Count**: 47 tests across 8 files
- **Duration**: ~5s
- **Command**: `bun run test:e2e`
- **Scope**: `bunfig.e2e.toml` → `src/presentation/**/tests/*.e2e.test.ts` (mapper/filter unit files excluded via `package.json` ignore patterns)
- **Prerequisites**: `DATABASE_URL` and SQS env vars (full `AppModule` boots)

### OpenAPI
- **Status**: PASS (local)
- **Command**: `bun run openapi:export --check`
- **Coverage**: `docs/api/openapi.json` matches the document the application builds from its route metadata: 7 provider paths and 9 schemas, `Idempotency-Key` on the submit, and health and metrics absent; `bun run openapi:export` rewrites the file
- **Prerequisites**: PostgreSQL for the boot; the pipeline step and the contract are in [`scripts/spec.md`](scripts/spec.md) and [`docs/API.md`](docs/API.md)

### Queues
- **Status**: PASS (local)
- **Command**: `docker compose --profile app up -d --build app`, then a wallet and a `BET` over HTTP
- **Coverage**: the outbox row is published to `wager-events.fifo`, which reports two messages for one processed bet (`WagerTransactionProcessed` and `WalletBalanceChanged`); `receive-message` returns the envelope with `eventType`, `aggregateId`, and `correlationId`; `wager-transactions.fifo` carries requests only
- **Prerequisites**: LocalStack with `docker/localstack/01-queues.sh` and `SQS_EVENTS_QUEUE_URL` set

### Auth
- **Status**: PASS (local)
- **Command**: `docker compose up -d`, `docker compose --profile auth up -d keycloak`, `bun run auth:smoke`
- **Coverage**: a real Keycloak 26 realm, a token from the password grant, and the API booted in `AUTH_MODE=jwt` against the realm JWKS: `401` without a token, wallet `201` while unguarded, bet `200` with `PROCESSED` and balance `95.00`, the provider read from the `provider_id` claim even with a spoofed header and body, `404` under the other provider, and `401` for a forged token
- **Prerequisites**: PostgreSQL, LocalStack, the applied migrations, and the `auth` profile; the script contract is in [`scripts/spec.md`](scripts/spec.md) and [`docs/testing.md`](docs/testing.md#auth)

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

### Kubernetes
- **Status**: PASS (local, 2026-10-24)
- **Command**: `bun run cluster:up`, then `bun run cluster:verify`; optionally `bun run cluster:observability`
- **Cluster**: `kind` 0.33 with `kindest/node:v1.32.0`, one control plane and two workers, and `standard` as the storage class
- **Coverage**: `cluster:up` built the image, loaded it into the three nodes, applied `overlays/local`, waited for both PostgreSQL instances and LocalStack, ran the migration Job, rolled both API replicas out, and answered `ready` on `http://127.0.0.1:30080/health/ready`
- **Instances**: five pods at rest — `postgres-primary-0`, `postgres-replica-0`, `localstack`, and two `api` replicas on different workers (`10.244.1.x` and `10.244.2.x`, both listed in `kubectl get endpoints api`); the primary and the streaming standby also landed on different workers, the primary on `fortune-tiger-worker` and the standby on `fortune-tiger-worker2`. `pg_stat_replication` on the primary reported `state: streaming`, `sync_state: async`
- **Financial path through the node port**: wallet `201` with `100.00`, `BET 30.00` answering `200 PROCESSED` with `70.00`, the repeat answering `200` with the same `transactionId`, `idempotentReplay: true`, and `70.00`, the ledger returning two entries (`CREDIT`, `DEBIT`), reconciliation `consistent: true` with `difference 0.00` over two entries, and `/metrics` answering `200` with `wager_transactions_processed_total`
- **Failure drills**: deleting one API pod kept `/health/ready` at `200` while the Deployment started a replacement; deleting `postgres-replica-0` returned it to `1/1` and `streaming` again
- **Load balancing**: `kubectl get endpoints api` listed two pod addresses on two workers; twenty independent requests through `30080` split `13` and `7` between the pods, read from each pod's `wager_transactions_processed_total`, and the wallet was debited exactly twenty times
- **Verification**: `bun run cluster:verify` printed all ten checks green — `3` nodes `Ready`, `2` endpoints, `streaming` replication, migration `1`, wallet `100.00`, bet `PROCESSED 70.00`, replay `true true`, ledger `2` entries, reconciliation `true 2`, and a burst reaching both pods `+13 / +7` — exit `0`
- **Suites against the cluster**: with the API scaled to zero, the integration (`51`), concurrency (`6`), and end-to-end (`47`) suites ran against the cluster's PostgreSQL and LocalStack through `kubectl port-forward`, so the managed instances serve the application and not only the probes
- **Idempotent apply**: a second `cluster:up` reused the cluster, rebuilt and reloaded the image, re-ran the migration Job (completed on the first attempt), and rolled the Deployment again
- **Cold start**: with the cluster deleted, `fortune-tiger:local` removed, `.tools` absent, and no `kind` on `PATH`, one `bun run cluster:up` downloaded `kind` into `.tools/bin`, created the three nodes, built and loaded the image, applied the tree, migrated, rolled both replicas out, and answered `ready` — exit `0` in 6.8 minutes
- **Full cycle**: `bun run cluster:down` removed the cluster and its volumes in 31 seconds; the next `bun run cluster:up` recreated it from zero in 12.2 minutes, and a later down/up after a manifest change finished in 6.8 minutes, the difference being the image pulls inside the fresh nodes. On the rebuilt cluster the nodes were `Ready`, both `api` endpoints were distinct, `pg_stat_replication` reported `streaming`, a `WIN` of `10.00` over a `50.00` wallet answered `200 PROCESSED` with `60.00`, the ledger held two entries, and reconciliation answered `consistent: true`
- **Docker restart**: with Docker Desktop stopped and every node container down, one `bun run cluster:up` started Docker Desktop, resumed the three node containers, waited for the API and the nodes, rebuilt, reapplied, migrated, and answered `ready` — exit `0` in 1.3 minutes
- **Observability overlay**: Prometheus discovered both API pods through `api-headless` and reported both targets `up`; Grafana answered `{"database":"ok"}` on `30030` and provisioned the `Fortune Tiger` dashboard from `docker/grafana`
- **Prerequisites**: Docker only. `cluster:up` reuses `kind` and `kubectl` from `PATH` or downloads the pinned releases into `.tools/bin`; the topology, the drills, and the limits are in [`docs/kubernetes.md`](docs/kubernetes.md), and the manifests are in [`kubernetes/`](kubernetes/)

## Delivery Docs

- `docs/API.md` — routes, headers, status table, error bodies, failure codes, queue events
- `docs/DELIVERY.md` — reviewer path: commands, expected output, reading map, limits
- `requests.http` — the same happy path by hand, plus conflict, rejection, and not-found cases
- `docs/testing.md` — what each suite covers
- `docs/load.md` — the load method, the two waves, the results, and the limits
- `docs/kubernetes.md` — the cluster topology, the commands, the failure drills, and the limits
- `kubernetes/spec.md` — the cluster, the workloads, and the guarantees the manifests carry
- `scripts/spec.md` — `verify`, `verify:full`, `demo`, `load`, and `cluster` behavior

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
- Unique `transaction_id` prevents duplicate inserts
- Application never updates or deletes ledger rows
- `Migration20261023090000` adds a database trigger that rejects direct `UPDATE` and `DELETE` mutations
- The same migration adds a foreign key from `wallet_ledger_entries.transaction_id` to `wager_transactions.id` and validates wallet, transaction, and currency identity before insert
- `ledger-integrity.test.ts` proves the database rejects direct update, delete, and orphan transaction references against PostgreSQL

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
- Env: `DATABASE_URL`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_QUEUE_URL`, `SQS_DEAD_LETTER_QUEUE_URL`, `SQS_EVENTS_QUEUE_URL`
- FIFO queues created before migrations/tests
- Pipeline: `bun run build` → `test:unit` → `test:int` → `test:concurrency` → `test:e2e` → `openapi:export --check` → `cluster:render`
- The `cluster` job runs in parallel with `test`: `bun run cluster:up` raises the kind cluster on the runner and `bun run cluster:verify` proves the shape (nodes, endpoints, replication, migration, financial flow, both replicas serving); a failure prints the nodes, the pods, and the last events

## Delivery Guarantees (honest)

- SQS + inbox/outbox provide **at-least-once** delivery; effects are deduplicated via inbox and idempotency constraints, not exactly-once end-to-end
- Outbox publish can duplicate on crash after send; consumer inbox prevents double financial effect
- Ledger uniqueness does not make the table immutable without application discipline

## Out of Scope

Out of scope: an audit store, OpenTelemetry, double-entry accounting, and partial reversal. In scope: the Prometheus exposition, the optional Keycloak `auth` profile, and the local load measurement.
