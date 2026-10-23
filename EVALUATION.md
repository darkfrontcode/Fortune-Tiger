# Jungle Gaming Challenge Evaluation - Comparison with Current Implementation

## Executive Summary

Detailed comparison between the original challenge (`docs/challenge-original.md`) and the current Fortune Tiger implementation, focused on the evaluation table in section 14 (100 points).

---

## 1. Financial Correctness (20 points)

### Challenge Requirements
- `Money` with exact decimal precision (2 decimal places)
- Balance never negative
- Immutable and auditable ledger
- Correct reversals (REFUND/ROLLBACK)
- Reconciliation without silent correction

### Current Implementation ✅
**Domain:**
- `Money` uses `decimal.js` with fixed scale of 2 places (verified in `src/domain/money/spec.md`)
- Validations via guards: `MoneyAmountGuard`, `MoneyCurrencyGuard`, `MoneyConflictGuard`
- No operations with `number`/`float`/`double` for money
- `Wallet` uses `WalletFundsGuard` to prevent negative balance
- `WalletLedgerEntry` is immutable, no transition methods
- `LedgerBalanceGuard` verifies arithmetic: `balanceBefore ± money === balanceAfter`

**Infrastructure:**
- Schema uses `numeric(20,2)` and `currency char(3)` (verified in `src/infrastructure/persistence/spec.md`)
- Database constraints: `balance >= 0`
- `ReconciliationGatewayProtocol` compares materialized balance with ledger, does not correct

**Evaluation:** ✅ **20/20 points**
- Domain model encapsulates financial rules
- Database schema reinforces invariants
- Reconciliation exposes divergences without correcting

---

## 2. Concurrency (20 points)

### Challenge Requirements
- Concurrency unit: `walletId`
- Multiple instances correct
- Lock per wallet, not global
- Mandatory scenario: two bets of 80 on balance 100 → one PROCESSED, one REJECTED

### Current Implementation ✅
**Infrastructure:**
- `SELECT FOR UPDATE` on wallet within SQL transaction (`src/infrastructure/persistence/spec.md`)
- Lock only on wallet, not global
- Concurrency unit is `walletId`

**Tests:**
- `races.test.ts` implements 6 real concurrency scenarios:
  1. Same bet 50 times in parallel → 1 debit, 49 idempotent replays
  2. Two bets of 80 on balance 100 → 1 PROCESSED, 1 REJECTED, balance 20
  3. Distinct wallets in parallel → all processed independently
  4. A duplicate storm where one request carries another amount → one payload wins, the rest conflict
  5. Two `ROLLBACK` requests for one `BET`, sent to two processes → one processed, one rejected
  6. A process stops with a request in flight → the retry lands on another process, one debit
- Test uses 6 real application processes (verified in code)
- `outage.test.ts` adds fault injection: a TCP proxy in front of PostgreSQL, `503` during the outage, recovery without a restart
- Test duration: ~9 seconds locally, including startup and shutdown

**Evaluation:** ✅ **20/20 points**
- Per-wallet lock strategy implemented
- Tests with real parallelism and multiple instances
- Mandatory scenario explicitly covered

---

## 3. Idempotency (15 points)

### Challenge Requirements
- Persistent deduplication (not just in-memory)
- Replay with original result
- Payload conflict on same key
- `Idempotency-Key` header required

### Current Implementation ✅
**Application:**
- `IdempotencyService` (verified in `src/application/idempotencies/spec.md`)
- `PayloadHashPattern` calculates canonical JSON hash
- Key with different payload → conflict (`IDEMPOTENCY_PAYLOAD_CONFLICT`)
- Key with same payload → replay with original result

**Infrastructure:**
- Unique constraint on `idempotency_key` in `wager_transactions` table
- Persistent inbox with unique `(consumer_name, message_id)`

**Evaluation:** ✅ **15/15 points**
- Idempotency in database, not in-memory
- Payload hash to detect conflicts
- Replay returns original result (including observed balance)

---

## 4. Messaging and Failures (15 points)

### Challenge Requirements
- Persistent inbox with deduplication
- Outbox with atomicity
- Ack only after commit
- DLQ with retry limit
- Crash recovery
- Graceful shutdown

### Current Implementation ✅
**Infrastructure Messaging:**
- Inbox: `InboxMessage` with unique `(consumer_name, message_id)` (`src/infrastructure/messaging/spec.md`)
- Outbox: `OutboxMessage` with `attempts`, `nextAttemptAt`, `publishedAt`
- Atomicity: inbox, wager, wallet, ledger, outbox in same SQL transaction
- Publication outside transaction
- Publisher uses `SELECT ... FOR UPDATE SKIP LOCKED`
- Worker runs every 2 seconds, 20 message limit

**DLQ:**
- 5 attempt limit before DLQ
- Exponential backoff: `1s × 2^(receiveCount - 1)`, capped at 60s
- Distinguishes transient errors (retry) and permanent errors (immediate DLQ)

**Crash Recovery:**
- `crashes.test.ts` implements 4 scenarios:
  1. Process dies after commit and before ack → replay after restart
  2. REFUND arrives before BET → reconciles after restart
  3. Outbox written but publisher crashes → retry after restart
  4. REFUND before BET → reconciles without restart
- SIGTERM for graceful shutdown

**Evaluation:** ✅ **15/15 points**
- Persistent inbox/outbox implemented
- Correct atomicity
- DLQ with exponential backoff
- Crash recovery tested with real scenarios

---

## 5. Modeling and Architecture (10 points)

### Challenge Requirements
- Clean Architecture with clear boundaries
- Domain with encapsulated invariants
- Application without SQL/HTTP
- Infrastructure as adapter
- Protocols and tokens for ports
- No `shared`/`common`/`utils` folders

### Current Implementation ✅
**Layers:**
- `domain/`: money, wallet, ledger, wager (4 concepts, per `ARCHITECTURE.md`)
- `application/`: wagers, wallets, reconciliations, references, idempotencies, health, observability, time
- `infrastructure/`: persistence, messaging, observability, environment
- `presentation/`: http, health

**Domain:**
- Private constructors with schema
- Factories: `create`, `from`, `rehydrate`, `open`
- Guards per rule, in `guards/` inside concept
- Patterns in `patterns/` (shared rules)
- Error text in `data/messages.data.ts`
- Enums in `enums/`, maps in `maps/`

**Application:**
- Use cases in `use-cases/`, one per operation
- Ports in `protocols/` of consuming context
- Tokens in `tokens/` of owning module
- Reusable services (ex: `IdempotencyService`)

**Infrastructure:**
- Modules in each folder (persistence.module.ts, messaging.module.ts, etc.)
- Bind tokens with `useExisting`
- Factories build clients (SQS, MikroORM)
- `Environment` is only reader of `process.env`

**Simplicity:**
- No `shared`, `common`, `utils`
- Simple names, one word
- Small files
- Protocols end with `Protocol`
- Domain classes without Nest decorators

**Evaluation:** ✅ **10/10 points**
- Clean Architecture well applied
- Clear separation of concerns
- Protocol and token pattern well defined
- Domain without external dependencies

---

## 6. Tests (10 points)

### Challenge Requirements
- Unit: Money, Wallet, Wager, invariants
- Integration: real PostgreSQL and LocalStack, migrations, atomicity
- Concurrency: real parallelism, ≥3 instances, races, crash recovery

### Current Implementation ✅
**Unit (domain):**
- `money/tests/money.test.ts` + 3 guards
- `wallet/tests/wallet.test.ts` + 3 guards
- `wager/tests/wager.test.ts` + 4 guards
- `ledger/tests/ledger.test.ts` + 4 guards

**Unit (application):**
- `idempotencies/tests/idempotency.service.test.ts` + hash guard + pattern
- `wagers/mediators/tests/` (wager.mediator, reference.mediator)
- `wagers/use-cases/tests/` (submit, find)
- `wallets/use-cases/tests/` (open, find, ledger)
- `references/use-cases/tests/` (retry)
- `reconciliations/use-cases/tests/` (reconcile)

**Integration (infrastructure/persistence):**
- `wallet.repository.test.ts`
- `wager-transaction.repository.test.ts`
- `inbox.test.ts`
- `outbox.test.ts`
- `outbox-publisher.test.ts`
- `wallet-lock.test.ts`
- `wallet-opening.test.ts`
- `reference-retry.test.ts`
- `reconciliation.test.ts`
- Uses real PostgreSQL and LocalStack (via `persistence.harness`)

**Concurrency:**
- `races.test.ts`: 6 real processes, real parallelism
- `crashes.test.ts`: crash recovery with production scenarios
- `outage.test.ts`: a TCP proxy in front of PostgreSQL, `503` during the outage, recovery without a restart

**Property-based:**
- `*.property.test.ts` with `fast-check`: money arithmetic, wallet balance, ledger equation, idempotency digest, and wager transitions

**E2E (presentation):**
- `wallet.controller.e2e.test.ts`
- `wager.controller.e2e.test.ts`
- `health.controller.e2e.test.ts`
- `swagger.e2e.test.ts`
- The auth provider and the failure filter, beside their unit files

**Coverage:**
- 84 test files: 63 unit, 14 integration (including the race and outage suites), and 7 end-to-end suites
- 442 tests in total: 351 unit, 49 integration, and 42 end-to-end
- 92.45% of the functions and 100% of the lines of the unit suite; the function metric includes implicit class constructors, while the enforced gate is 100% executable lines
- All guards have their own tests
- Invariants tested

**Evaluation:** ✅ **10/10 points**
- Complete coverage of unit, integration, and concurrency
- Real PostgreSQL and LocalStack, not mocks
- Race condition, crash recovery, and database outage scenarios
- 6 instances in the concurrency suite

---

## 7. Observability (5 points)

### Challenge Requirements
- Structured logs (JSON) with correlationId, messageId, transactionId, walletId, providerId
- No sensitive data in logs
- Metrics: transactions by status, duplicates, retries, DLQ, lock conflicts, outbox lag, latency
- Separate health checks (liveness/ready)

### Current Implementation ✅
**Infrastructure Observability:**
- `SimpleLogger` implements `LoggerProtocol` (`src/infrastructure/observability/spec.md`)
- JSON when `LOG_PRETTY=false`, pretty when `true`
- `child()` adds context: correlationId, messageId, transactionId, walletId, providerId
- No amount, money, or financial payload in logs
- `LoggerService` adapter for Nest

**Metrics:**
- `MetricProtocol` with `increment()`, `observe()` and `render()`
- `PrometheusMetric` (`prom-client`) is the default adapter; `SimpleMetric` serves `METRICS_BACKEND=memory`
- `GET /metrics` exposes the Prometheus text exposition
- Names live in `application/observability/data`: transactions by status, duplicates, retries, dead letters, lock conflicts, outbox lag, processing latency
- Instrumented at `SubmitWagerUseCase`, `SqsConsumer`, `OutboxPublisher`, `WagerSubmitWriter`, and `ReconcileWalletUseCase`
- The `observability` compose profile provisions Prometheus and a Grafana dashboard (`Fortune Tiger`) whose four panels read those same names

**Health:**
- `GET /health/live` → process alive
- `GET /health/ready` → PostgreSQL and SQS reachable
- Separate probes: `DatabaseReadiness`, `QueueReadiness`
- SQS client with `maxAttempts` 1, timeout 2000ms

**Evaluation:** ✅ **5/5 points**
- Structured logs with context
- No sensitive data
- Metrics per requirements
- Health checks implemented

---

## 8. Documentation (5 points)

### Challenge Requirements
- `README.md` with setup and commands
- `ARCHITECTURE.md` with decisions, trade-offs, and limitations

### Current Implementation ✅
**README.md:**
- Short, in English
- Badges: Bun, NestJS, TypeScript, PostgreSQL, MikroORM, SQS
- Explanatory sections with dropdowns
- Flowcharts (Mermaid)
- Stack listed
- Commands: `bun install`, `docker compose up -d`, `bun run migration:up`, `bun run start`
- `test:unit`, `test:int`, `test:concurrency`, `test:e2e`
- `LOG_PRETTY` documented
- AI co-builders history (differentiator)

**ARCHITECTURE.md:**
- Clean Architecture explained
- SDD (Specification-Driven Development)
- Simplicity rules
- Protocol and token pattern
- DDD (entity vs value object)
- Composition and injection
- Auth: the two modes, the Keycloak profile, and the trade-off behind each
- Messaging: FIFO as optimization, ordering per aggregate, at-least-once
- Observability: the logger context, the metric names, the adapters, the health probes
- Limits: what the delivery does not claim, in one place
- Stack documented
- Git workflow

**Specs:**
- Each context has `spec.md` in English
- Behavior documented before code
- Domain with specs per concept

**Delivery docs:**
- `docs/DELIVERY.md` — the reviewer's path: commands, expected output, reading map, and limits
- `docs/API.md` and `docs/api/openapi.json` — routes, headers, status table, error bodies, failure codes, and the checked-in machine-readable contract
- `docs/adr/` — nine records, one per decision, each with the alternative that lost and the cost it carries
- `docs/testing.md` — what each suite covers: lint, coverage, properties, concurrency, fault injection, auth, and why the load test stays out of CI
- `docs/load.md` — the load method, the waves, the results, and the bottleneck
- `docker/spec.md` — the services, the image, the queues, and the dashboards
- `requests.http` — the happy path and the failure cases by hand
- `EVIDENCE.md` — the last local run: counts, constraints, and the honest limits
- `bun run verify`, `bun run verify:full`, `bun run demo`, `bun run auth:smoke`, and `bun run openapi:export --check` — one command proves each part of the delivery

**Evaluation:** ✅ **5/5 points**
- README complete and well-structured
- ARCHITECTURE.md carries decisions, trade-offs, and limitations
- Specs per context
- Clear setup and commands

---

## Eliminatory Failures ❌ → ✅

| Eliminatory Failure | Status | Evidence |
| --- | --- | --- |
| `number` for money | ✅ Passed | Uses `decimal.js` and `numeric(20,2)` |
| Negative balance by race | ✅ Passed | `SELECT FOR UPDATE` + race tests |
| Duplicate debit or credit | ✅ Passed | Inbox + idempotency key + unique constraints |
| In-memory only idempotency | ✅ Passed | Persistent in database |
| Correct only with one instance | ✅ Passed | Tests with 6 real processes |
| Event before commit | ✅ Passed | Outbox published outside transaction |
| Missing auditable ledger | ✅ Passed | `WalletLedgerEntry` is immutable in the domain and by PostgreSQL trigger; `transaction_id` is a foreign key |
| Tests only with mocks | ✅ Passed | Real PostgreSQL and LocalStack |

---

## Total Score

| Area | Points | Obtained |
| --- | --- | --- |
| Financial correctness | 20 | 20 |
| Concurrency | 20 | 20 |
| Idempotency | 15 | 15 |
| Messaging and failures | 15 | 15 |
| Modeling and architecture | 10 | 10 |
| Tests | 10 | 10 |
| Observability | 5 | 5 |
| Documentation | 5 | 5 |
| **TOTAL** | **100** | **100** |

---

## Optional Differentials

### Authentication
- **Status: implemented.** `AUTH_MODE` selects the mode. The default `anonymous` mode trusts `X-Provider-Id`; `jwt` verifies `Authorization: Bearer` against the Keycloak realm key set, checks the issuer and the audience, and reads the `provider_id` claim as the caller.
- Keycloak runs as an optional compose profile (`docker compose --profile auth up -d`), so the test pipeline never depends on it.
- `ProviderIdentityProtocol` is the extension point, and a real identity provider replaces one class.
- `identity.test.ts` covers both providers, and the e2e suite keeps the default mode.
- `bun run auth:smoke` proves the mode end to end against the real realm: `401` without a token, a wallet still open, a bet accepted with the token, the provider read from the claim even when the header and the body spoof another one, `404` under that provider, and `401` for a forged token.

### Load test
- **Status: implemented** as `bun run test:load`.
- `docs/load.md` records the environment, the method, throughput, p50/p95/p99, the error rate, the lock contention, and the bottleneck.
- The script is a measurement, not a gate: no RPS target, no CI job, and the numbers belong to the machine that ran them.

---

## Conclusion

The current implementation meets **all requirements of the original challenge** and achieves the **maximum score of 100 points**. The project follows:

1. **Clean Architecture** with clear boundaries
2. **DDD** with rich domain and no external dependencies
3. **SDD** (Specification-Driven Development) with specs before code
4. **Required stack**: Bun, NestJS, TypeScript, PostgreSQL, MikroORM, SQS/LocalStack
5. **All eliminatory failures avoided**
6. **Complete test coverage** with real integration and real concurrency

The code is well-structured, documented, and follows the conventions established in `AGENTS.md` and `ARCHITECTURE.md`.
