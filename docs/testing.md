# Testing

A test proves the property. It does not replace Postgres or SQS with a mock when the property depends on them.

## Unit

`Money`: scale, invalid input, currency conflict. `Wallet`: balance and version. `BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`. Same key with a different payload. Factories `create` and `rehydrate`.

A unit case is a theory. `TheoryProtocol` lives in `src/application/protocols`. The case carries `params`, `expected`, and a description `WHEN` … `SHOULD`. The test compares the actual boolean with `expected`. The domain file under test does not import it.

Planned command: `bun test src` through `test:unit`.

## Integration

Real containers. Migrations and constraints. Atomicity of wallet, ledger, inbox, and outbox. Inbox redelivery. Concurrent publishers. Retry and DLQ. Consistency after a restart.

Planned command: `test:int`.

## Concurrency

Real parallelism.

1. The same bet 50 times in parallel → one debit.
2. Balance 100, two bets of 80 at the same time → one `PROCESSED`, one `REJECTED`, balance 20, one `DEBIT`.
3. Distinct wallets in parallel.
4. Three or more app processes.
5. Process killed after commit and before ack.
6. Two publishers on the same outbox.
7. `ROLLBACK` or `REFUND` before the `BET`.
8. Restart and final consistency.

In every scenario: `wallet.balance` equals the balance reconstructed from the ledger.

Planned command: `test:concurrency`.

## API

Status table in `src/presentation/http/spec.md`, invalid payload, and idempotent replay. It enters the README only when the test exists.

## Load

Out of this delivery. If time remains, `bun run test:load`, with environment, method, throughput, p50, p95, p99, error rate, conflict, and outbox lag. No RPS target.
