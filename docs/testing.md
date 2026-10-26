# Testing

A test proves the property. It does not replace Postgres or SQS with a mock when the property depends on them.

## Lint

`bun run lint` runs Biome over the repository, and `bun run lint:fix` applies the safe fixes it can. The configuration is `biome.json`, and `bun run verify` runs the same check before the type-check, so a push and the pipeline catch the same problem.

The linter is on and the formatter is off. The house style is explicit — one-line guard returns, grouped imports, a chosen line length, and `new Array<T>()` over an array literal — so a formatter would rewrite every file without changing one behavior.

The gate is additive: it lands over the delivered code and rewrites no line of it. A rule that would disagree with the house style is turned off here instead of applied to the source. Four rules are off with a reason: `useArrayLiterals` because the array is built with `new Array<T>()`, `useImportType` because Nest reads the constructor type at runtime through `emitDecoratorMetadata`, `noStaticOnlyClass` because a concept holds static factories beside a private constructor, and `useOptionalChain` because the code spells `undefined` out. `noExplicitAny` is an error outside the tests. A rule that answers at warning level reports without failing the gate and without an automatic rewrite; `useTemplate` and `noUnusedImports` answer that way over the delivered code, and cleaning them is a separate change.

## Verify

`bun run verify` is the static gate: `bun run build` and `bun run test:unit`. It needs no Docker, database, or queue.

`bun run verify:full` is the complete gate. It reads `.env` through `Environment`, checks that `DATABASE_URL`, `AWS_ENDPOINT_URL`, and `MONGODB_URL` answer within two seconds, and then runs the migrations plus the integration, audit store, journey store, concurrency, and end-to-end suites. A missing variable or a port that does not answer stops the run with the dependency name and the `docker compose up -d` hint. The first failing step ends the run with exit code `1`.

Both commands live in `scripts/verify.ts`, and the folder spec is `scripts/spec.md`.

## Demo

`bun run demo` boots the application on a free port and calls the HTTP API. It opens a wallet, submits a bet, repeats it with the same idempotency key, submits a loss, reads the ledger page, reconciles the wallet, and reads the metrics. Each step asserts the contract, and the first failure ends the run with exit code `1`. The script is `scripts/demo.ts`, and the folder spec is `scripts/spec.md`.

## Coverage

`bun run test:coverage` runs the unit suite with Bun coverage and writes `coverage/lcov.info`, which the pipeline keeps as an artifact. The reporters are `text` and `lcov` in `bunfig.toml`.

The unit suite must cover **100% of executable lines**. The line threshold is enforced at `1.0` in `bunfig.toml`. Bun reports implicit class constructors as functions even when they contain no domain behavior; those constructors are not added merely to inflate the function metric. The latest report is **100% lines and 93.53% functions**. Persistence, the MongoDB audit adapter, and the HTTP end-to-end suites stay out of that number on purpose: they need PostgreSQL, MongoDB, and SQS, so their coverage belongs to `bun run verify:full`, not to a gate that runs with nothing up.

The badge on the README reads the line number. It is updated by hand when the number moves, so it never claims a value the run did not produce.

## Unit

Unit tests sit in `tests/` beside the module they cover. The file name is `{subject}.test.ts`.

`Money`: scale, invalid input, currency conflict. `Wallet`: balance and version. `BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`. Same key with a different payload. Factories `create` and `rehydrate`. The audit use case, the event guard, the mapper, and the consumer are unit-tested too: valid projection, duplicate acknowledgement, retry under the limit, dead letter on the fifth receive, and an invalid body that never reaches the store.

A unit case is a theory. The `Theory` type lives in `src/infrastructure/protocols/theory.protocol.ts`. A case carries `params` and `expected`; each test supplies its own `WHEN` … `SHOULD` description. Production code does not import this type.

`bun run test:unit` runs the unit suite.

## Integration

Real PostgreSQL and LocalStack. Migrations and constraints. Atomicity of wallet, ledger, inbox, and outbox. Inbox redelivery after process termination. Concurrent publishers. Retry and DLQ. Reversals that arrive before their references. Consistency after a restart.

`bun run test:int` runs these integration scenarios.

## Audit store

Real MongoDB and LocalStack, through `bun run test:audit`. The suite covers:

- one document per `eventId`, and a second delivery of the same event answered as a duplicate;
- filters by `wagerId`, `correlationId`, `eventType`, and an inclusive time range;
- ordering by `occurredAt` and then `eventId`, with the limit applied;
- the unique index on `eventId`;
- an actual outbox event envelope projected into the timeline, including the `WalletBalanceChanged` event and its `direction` metadata;
- the same correlation across the lifecycle;
- an unreachable MongoDB refusing the write instead of acknowledging it;
- an invalid event dead-lettered without a write.

The HTTP timeline is covered by `audit.e2e.test.ts`: it submits a wager, waits for the outbox and the audit consumer, and reads the timeline back with its filters and its provider scoping. `test/audit-channel.e2e.ts` gives that file its own FIFO pair on LocalStack and clears the pending outbox rows before the app boots, so a backlog left by another suite cannot sit in front of its events. `audit-independence.e2e.test.ts` boots the HTTP module with an unreachable MongoDB and proves a wallet and a wager still succeed.

## Journey store

The journey is the per-caller view of the stages: route, use case, database, queue. Real MongoDB, through `bun run test:journey`. The suite covers:

- one document per `stepId`, and a second write of the same step refused as a duplicate;
- one aggregate in `occurredAt` order, with the tie broken by `stepId`;
- filters by `flowId`, `playerId`, `providerId`, `stage`, `outcome`, and an inclusive time range;
- a bounded page by `limit`;
- an unreachable MongoDB refusing the record instead of buffering it.

The HTTP routes are covered by `journey.e2e.test.ts`: it opens a wallet, submits a wager, and reads the wager journey and the player journey back with their filters and their provider scoping. `journey-independence.e2e.test.ts` boots the HTTP module with an unreachable MongoDB and proves a wallet and a wager still succeed, so the journey store is never on the financial path.

## Properties

`fast-check` runs the rule as a property, not as a handful of examples. Each property draws 100 to 200 cases, and a failure prints the smallest counterexample it found. The files are `*.property.test.ts` beside the suite they belong to, so `bun run test:unit` runs them with everything else.

- `Money`: addition is commutative and associative, zero is the identity, subtract undoes add, serialization round-trips at two places, and a non-negative amount has exactly one sign.
- `Wallet`: a random sequence of credits and debits that stays inside the opening balance ends at the arithmetic sum, the version counts the movements that changed the balance, and a debit one cent past the balance is refused without a change.
- `Ledger`: a movement whose direction produces the closing balance is balanced, a wrong closing balance is refused, and a movement in another currency is refused.
- `Idempotency`: the digest ignores key order, changes when a business field changes, changes when the amount gains one cent, and treats an absent reference like an undefined field.
- `Wager`: only `PROCESSED`, `REJECTED`, and `FAILED` are terminal, a closed wager refuses every target, an open wager follows only the transition table, and a reversal without a reference is refused.

## Concurrency

Real parallelism against PostgreSQL. The race suite starts six independent HTTP application processes against the same database.

1. The same bet 50 times in parallel across six processes → one processed wager and one debit; the other 49 responses are idempotent replays.
2. Balance 100, two bets of 80 at the same time across processes → one `PROCESSED`, one `REJECTED`, balance 20, one `DEBIT`.
3. Bets for distinct wallets in parallel across all six processes → each wager is processed independently.
4. A duplicate storm that carries a different amount once → one payload wins, every other response is a conflict, and the single debit matches the stored winner.
5. Two `ROLLBACK` requests for one `BET`, sent to two processes at once → one `PROCESSED`, one `REJECTED`, balance restored, one credit per processed reversal.
6. A process stops with a request in flight → the retry lands on another process and the wallet still shows one debit.
7. Process killed after commit and before ack.
8. Two publishers on the same outbox.
9. `ROLLBACK` or `REFUND` before the `BET`.
10. Restart and final consistency.

In every scenario: `wallet.balance` equals the balance reconstructed from the ledger.

`bun run test:concurrency` runs the multi-process race scenarios. PostgreSQL and LocalStack must be running, and `.env` must point to them.

## Fault injection

`outage.test.ts` puts a TCP proxy between the application and PostgreSQL. It opens a wallet and processes a bet through the proxy, stops the proxy, and asserts that readiness and a new submit answer `503` instead of hanging. It then starts the proxy again on the same port and asserts that readiness recovers to `200` and the next submit is processed, without restarting the application.

The proxy is part of the test, not of the product. It destroys open sockets on stop, so the pool sees a dead connection instead of a silent one.

## API

Status table in `src/presentation/http/spec.md`, invalid payload, and idempotent replay. It enters the README only when the test exists.

`swagger.e2e.test.ts` reads `GET /docs-json` and proves the provider paths, the request and response schemas, the required `Idempotency-Key` header, and that health and metrics stay out of the document. It also reads `GET /docs` and proves the UI answers. `audit.e2e.test.ts` proves the timeline route, its filters, and its provider scoping against a live stack.

`bun run openapi:export --check` goes one step further than the route test: it rebuilds the document from the code and compares it with the checked-in `docs/api/openapi.json`. A route, a DTO, or a header that changes without the file fails the pipeline, so the contract in the repository stays the contract the service serves. `bun run openapi:export` rewrites the file.

## Auth

`bun run auth:smoke` proves the `jwt` mode against a real Keycloak, not a stub. It reads the realm discovery document, asks for a token with the password grant, boots the API with `AUTH_MODE=jwt` and the `OIDC_*` values from that document, and drives the routes:

- `POST /wagering/transactions` without a token answers `401`;
- `POST /wallets` answers `201`, because the wallet routes stay open in both modes;
- a bet with the token answers `200` with `PROCESSED`, and the stored wager carries the `provider_id` claim even though the body and the `X-Provider-Id` header name another provider;
- the same pair read under that other provider answers `404`;
- a forged token answers `401`.

The signature check runs against the JWKS the realm publishes, so a token that Keycloak did not sign is refused for the real reason. The script is not part of CI: it needs the `auth` profile, so the pipeline stays free of an identity provider. `identity.test.ts` covers the guard and both providers with a stub identity, and the status table is in `src/presentation/http/spec.md`.

## Load

`bun run test:load` calls a running API, so the client and the server do not share an event loop. Start the API with `bun run start` first. The script runs two measured waves:

1. **Distinct wallets** — one wallet per bet, so no two requests touch the same row. It shows the throughput without wallet contention.
2. **Hot wallet** — every bet debits the same wallet, so `SELECT FOR UPDATE` serializes them. It shows the cost of the lock.

Each wave reports the request count, client throughput, p50, p95, p99, and HTTP errors. After the waves the script proves every distinct wallet ended at `9.00`, the hot wallet ended at `1000.00`, its reconciliation is consistent with one ledger entry per bet plus the opening, the processed counter grew by the wave sizes, and no duplicate key reached the API.

Flags: `--wallets=<n>` (default `50`), `--hot=<n>` (default `50`), `--concurrency=<n>` (default `25`), and `--target=<url>` (default `http://127.0.0.1:<PORT>` from `Environment`). The folder spec is `scripts/spec.md`, and [`docs/load.md`](load.md) records the environment, the method, the results, and the bottleneck.

The load test is not part of CI: it needs a running stack and produces numbers that depend on the machine, not on the code. No RPS target is claimed.
