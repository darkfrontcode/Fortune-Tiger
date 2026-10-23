# Delivery

A reviewer's path through Fortune Tiger: what to run, what to expect, and where the proof lives.

The statement is in [`docs/challenge-original.md`](challenge-original.md). The folder map is in [`ARCHITECTURE.md`](../ARCHITECTURE.md). Every folder carries an English `spec.md` written before its code.

## Prerequisites

- Bun 1.x
- Docker with Compose, for PostgreSQL 16 and LocalStack
- Ports `3000`, `5432`, and `4566` free

## Five minutes

```bash
bun install
cp .env.example .env
docker compose up -d
bun run migration:up
bun run verify
bun run demo
```

What each command answers:

| Command | What it proves |
| --- | --- |
| `docker compose up -d` | PostgreSQL 16 and LocalStack, with both FIFO queues created by the ready hook in `docker/localstack` |
| `bun run migration:up` | the schema is versioned and reversible |
| `bun run verify` | TypeScript strict and the unit suite pass, with no dependency running |
| `bun run demo` | the happy path against a live application: wallet, bet, replay, loss, ledger, reconciliation, metrics |

The demo boots the application on a free port, so it does not need `bun run start` in another terminal, and it does not collide with a server already on `3000`.

## Try the API by hand

```bash
bun run start
```

Then open [`requests.http`](../requests.http) in the VS Code REST Client or the JetBrains HTTP client. The file walks the same steps as the demo, plus the idempotency conflict, the insufficient funds rejection, a reversal without a reference, pagination, and the `404` cases.

The route rules are in [`docs/API.md`](API.md) and in [`src/presentation/http/spec.md`](../src/presentation/http/spec.md).

## The full gate

```bash
bun run verify:full
```

The gate reads `.env` through `Environment`, checks that PostgreSQL and LocalStack answer within two seconds, then runs the migrations, the integration suite, the concurrency suite, and the end-to-end suite. The first failure stops the run with exit code `1`.

The concurrency suite starts three independent application processes against the same database: the same bet 50 times becomes one debit, two bets of 80 on a balance of 100 leave one processed and one rejected, and the stored balance always equals the balance rebuilt from the ledger.

## Where to read

- [`README.md`](../README.md) — the four folders, the stack, and the commands.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the layer rules and the composition.
- [`docs/API.md`](API.md) — routes, headers, status, error bodies, and failure codes.
- [`docs/testing.md`](testing.md) — what each suite covers and why.
- [`EVIDENCE.md`](../EVIDENCE.md) — the last local run: counts, constraints, and the honest limits.
- [`EVALUATION.md`](../EVALUATION.md) — the section 14 checklist against the code.

The code reads top to bottom: `src/domain` holds `Money`, `Wallet`, `Ledger`, and `Wager`; `src/application` holds the use cases, the idempotency rule, the mediators, and the ports; `src/infrastructure` holds MikroORM, SQS, the inbox and outbox, the logger, and the metrics; `src/presentation` holds HTTP and health.

## What stands out

- **The domain decides.** `Money` uses `decimal.js` with exact scale, `Wallet` never goes negative, the ledger entry is immutable and checked by `balanceBefore ± money = balanceAfter`, and the wager state machine only moves forward.
- **The database is the final guarantee.** `SELECT FOR UPDATE` on the wallet inside the same SQL transaction as the ledger, the wager, the inbox, and the outbox. Unique constraints on the idempotency key and on the provider pair back the in-memory checks.
- **Delivery is at-least-once, and the effect is single.** FIFO is an optimization; the inbox deduplicates redelivery and the idempotency rule deduplicates the provider's retry.
- **The observability is scrapeable.** `GET /metrics` answers the Prometheus exposition from the process that served the request, with names owned by the application.
- **The spec arrives before the code.** Every folder has an English `spec.md`, and a behavior that is not in the spec is not in the code.

## Limits, stated up front

- Delivery is **at-least-once**, not exactly-once. A crash after the commit and before the ack redelivers the message; the inbox keeps the effect single.
- Ledger immutability is enforced by the application, not by a database grant. The unique `transaction_id` prevents a duplicate row, not an `UPDATE`.
- Auth is an extension point: `AuthGuard` allows every request and `AnonymousProviderIdentity` trusts the caller. Keycloak and JWT are not part of this delivery.
- OpenTelemetry, double-entry accounting, and partial reversal are out. The Prometheus exposition is in.
- A load test is not part of the delivery.
