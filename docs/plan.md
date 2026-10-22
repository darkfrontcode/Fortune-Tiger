# Plan

Every text written in this project is English, including `README.md`. The statement copy in `docs/challenge-original.md` stays as published.

Each phase closes with a green test of what it introduced. Do not postpone the two bets of 80 until the end: that case lands as soon as debit exists.

No phase starts in code while its `spec.md` is missing.

Application capabilities are plural and one word: `wagers`, `wallets`, `references`, `reconciliations`, `idempotencies`. Each application operation lives in its capability's `use-cases/` folder; reusable responsibilities remain services. Domain folders stay `money`, `wallet`, `ledger`, and `wager`. Types of one concept live in `types.ts`, in one namespace `{Concept}Type`. The word `props` is not used.

`src` has only `domain`, `application`, `infrastructure`, and `presentation`. There is no folder named `shared`, `common`, or `utils`. That name is a junk drawer.

A plug-in contract ends with `Protocol`. Application ports live in the `protocols/` folder of the consuming capability. Cross-cutting application ports have explicit `observability` and `time` owners. Infrastructure-internal and presentation-specific contracts stay beside their consumers. The domain has no application imports. Generic mapper, guard, and pattern contracts are not used without a real plug-in boundary. Test-only theory data lives in root `test-support/`. No protocol per class.

History uses Conventional Commits. A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits. The subject names the functionality, as in `feat/docs/readme`. The commit uses that same type. One commit per pull request. `main` changes only through a pull request. Work does not start on `main`. Split a diff that no longer fits one commit.

`README.md` stays short and in English: the four folders, dropdowns for what each one holds, badges, and the stack. Update it when a phase lands. Do not list every spec. Do not list what the project leaves out.

The first step is the domain. Nest comes last. One step is one thing and its test.

The two bets of 80 do not wait for the end. A second sequential debit fails in the domain. The simultaneous pair lands in the lock step.

## Domain

1. **Money.** `decimal.js`, scale 2, rejection of `NaN`, scientific notation, more than 2 decimal places, and a negative amount. Currency conflict. Factories `from` and `zero`. The runner is Bun and TypeScript strict, enough for `test:unit`. No Nest, no MikroORM, no Compose, no health, no logger.
2. **Wallet.** Schema, `debit`, `credit`, `version` starting at 1, `open`. The balance is never negative.
3. **Ledger.** An immutable entry. `balanceBefore ± money = balanceAfter`. No update and no delete.
4. **Wager.** Born `PENDING`. Transitions through `PROCESSED`, `REJECTED`, and `FAILED`. Terminals do not change. The `failureCode` list from the spec.
5. **Effects.** `BET` debits. `WIN` credits. `LOSS` changes neither balance nor ledger. `REFUND` and `ROLLBACK` once, same amount. `OPENING` is internal. One unit test each.

## Application, before HTTP

6. **Idempotency.** SHA-256 of the canonical JSON. The same key and the same hash return the result, with the observed balance. The same key and a different hash is a conflict.

## Repository

7. **Wallet and ledger in Postgres.** MikroORM, reversible migrations, `numeric(20,2)`, unique `playerId` + `currency`. No route.
8. **Wager in Postgres.** Unique `idempotency_key` and unique `(provider_id, external_transaction_id)`.
9. **Lock.** `SELECT FOR UPDATE` on the wallet, in the same transaction as the ledger and the wager. Balance 100 and two bets of 80 at once: one `PROCESSED`, one `REJECTED`, balance 20, one `DEBIT`.
10. **OPENING.** An initial balance above zero writes `OPENING` and `CREDIT` in the same SQL transaction as the open.

## Use cases on the repository

11. **Transactions.** The use case HTTP and the queue will call. No controller yet.
12. **Reconciliation.** Compares the stored balance with the reconstructed balance. Does not repair.

## Messaging, before the Nest boot

13. **Inbox.** Unique `(consumerName, messageId)`, in the same SQL transaction. Ack waits for the consumer.
14. **Outbox.** In the same transaction: `WagerTransactionProcessed`, `WagerTransactionRejected`, `WalletBalanceChanged` only when the balance changed, `WagerTransactionPendingReference`. A processed `LOSS` publishes the processed event and does not publish the balance change.
15. **SimpleLogger.** The hr-tech shape, `child`, pretty, and JSON. No `LoggerService`.
16. **Missing reference.** `PENDING_REFERENCE`, a worker every 2s, backoff `1s × 2^n` capped at 60s, 12 attempts, then `REJECTED` and `REFERENCE_NOT_FOUND`.
17. **Publisher.** `FOR UPDATE SKIP LOCKED`.
18. **Consumer.** Ack only after commit. A business failure acks. A transient failure retries. A permanent failure goes to the DLQ. `SIGTERM` returns visibility or finishes the in-flight message.

## Nest, last

19. **Boot.** `src/main.ts`, `src/app.module.ts`, `GET /health/live` and `GET /health/ready`. Compose with Postgres 16 and LocalStack.
20. **HTTP.** Every wallet, wager, reconciliation, and health route calls one application use case. Application errors are translated by the global HTTP filter. The `LoggerService` adapter arrives here.

## Proof and reading

21. **Races.** The same bet 50 times becomes one debit. Distinct wallets in parallel. Three or more processes.
22. **Crash.** Kill after commit and before ack. Two publishers. `ROLLBACK` or `REFUND` before the `BET`. Restart with the balance equal to the ledger. Completed: integration tests verify SQS redelivery, concurrent publishers, out-of-order refund, and ledger consistency after restart.
23. **Usage README.** Setup, commands, environment, and `LOG_PRETTY`. `ARCHITECTURE.md` then describes only what is implemented. FIFO is not the guarantee. Auth is a no-op. The happy path is `BRL`.
