# Testing

A test proves the property. It does not replace Postgres or SQS with a mock when the property depends on them.

## Verify

`bun run verify` is the static gate: `bun run build` and `bun run test:unit`. It needs no Docker, database, or queue.

`bun run verify:full` is the complete gate. It reads `.env` through `Environment`, checks that `DATABASE_URL` and `AWS_ENDPOINT_URL` answer within two seconds, and then runs the migrations plus the integration, concurrency, and end-to-end suites. A missing variable or a port that does not answer stops the run with the dependency name and the `docker compose up -d` hint. The first failing step ends the run with exit code `1`.

Both commands live in `scripts/verify.ts`, and the folder spec is `scripts/spec.md`.

## Demo

`bun run demo` boots the application on a free port and calls the HTTP API. It opens a wallet, submits a bet, repeats it with the same idempotency key, submits a loss, reads the ledger page, reconciles the wallet, and reads the metrics. Each step asserts the contract, and the first failure ends the run with exit code `1`. The script is `scripts/demo.ts`, and the folder spec is `scripts/spec.md`.

## Unit

Unit tests sit in `tests/` beside the module they cover. The file name is `{subject}.test.ts`.

`Money`: scale, invalid input, currency conflict. `Wallet`: balance and version. `BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`. Same key with a different payload. Factories `create` and `rehydrate`.

A unit case is a theory. The `Theory` type lives in `src/infrastructure/protocols/theory.protocol.ts`. A case carries `params` and `expected`; each test supplies its own `WHEN` … `SHOULD` description. Production code does not import this type.

`bun run test:unit` runs the unit suite.

## Integration

Real PostgreSQL and LocalStack. Migrations and constraints. Atomicity of wallet, ledger, inbox, and outbox. Inbox redelivery after process termination. Concurrent publishers. Retry and DLQ. Reversals that arrive before their references. Consistency after a restart.

`bun run test:int` runs these integration scenarios.

## Concurrency

Real parallelism against PostgreSQL. The race suite starts three independent HTTP application processes against the same database.

1. The same bet 50 times in parallel across three processes → one processed wager and one debit; the other 49 responses are idempotent replays.
2. Balance 100, two bets of 80 at the same time across processes → one `PROCESSED`, one `REJECTED`, balance 20, one `DEBIT`.
3. Bets for distinct wallets in parallel across all three processes → each wager is processed independently.
4. Three or more application processes.
5. Process killed after commit and before ack.
6. Two publishers on the same outbox.
7. `ROLLBACK` or `REFUND` before the `BET`.
8. Restart and final consistency.

In every scenario: `wallet.balance` equals the balance reconstructed from the ledger.

`bun run test:concurrency` runs the multi-process race scenarios. PostgreSQL and LocalStack must be running, and `.env` must point to them.

## API

Status table in `src/presentation/http/spec.md`, invalid payload, and idempotent replay. It enters the README only when the test exists.

`swagger.e2e.test.ts` reads `GET /docs-json` and proves the provider paths, the request and response schemas, the required `Idempotency-Key` header, and that health and metrics stay out of the document. It also reads `GET /docs` and proves the UI answers.

## Load

Out of this delivery. If time remains, `bun run test:load`, with environment, method, throughput, p50, p95, p99, error rate, conflict, and outbox lag. No RPS target.
