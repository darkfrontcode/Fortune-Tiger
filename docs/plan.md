# Plan

Every text written in this project is English, including `README.md`. The statement copy in `docs/challenge-original.md` stays as published.

Each phase closes with a green test of what it introduced. Do not postpone the two bets of 80 until the end: that case lands as soon as debit exists.

No phase starts in code while its `spec.md` is missing.

Use-case folders are one plural word, with no hyphen: `transactions`, `reconciliations`, `idempotencies`. The file inside is the singular subject (`wager.service.ts`). Domain folders stay `money`, `wallet`, `ledger`, and `wager`.

A plug-in contract ends with `Protocol`. The file is `mapper.protocol.ts`. Inside, the TypeScript interface has an input and an output, as in `map(input)`. `MapperProtocol` is the naming example, not a type in this project. The clock is `ClockProtocol`. Provider identity is `ProviderIdentityProtocol`. The logger implements `LoggerProtocol`. No protocol per class.

History uses Conventional Commits. A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits. The subject names the functionality, as in `feat/docs/readme`. The commit uses that same type. One commit per pull request. `main` changes only through a pull request. Work does not start on `main`. Split a diff that no longer fits one commit.

`README.md` stays short and in English: the four folders, dropdowns for what each one holds, badges, and the stack. Update it when a phase lands. Do not list every spec. Do not list what the project leaves out.

## 1. Bootstrap

Bun 1.x, NestJS, TypeScript strict, MikroORM, Compose (Postgres 16 + LocalStack), `GET /health/live` and `GET /health/ready`, `SimpleLogger` pretty on `start:dev` and JSON in Compose.

Scripts: `start:dev`, `test:unit`, `test:int`, `test:concurrency`, `migration:create`, `migration:up`, `migration:down`.

## 2. Money and domain

An entity has an `id`. A value object has no `id`. The file is the concept (`ledger/ledger.ts`). `entities/` and `values/` appear inside a concept only when that concept needs both. Do not label each concept ahead of time.

Skeletons from section 6 of the statement. Tests for scale, rejection of `NaN`, scientific notation, more than 2 decimal places, and a negative amount on input, currency conflict, and the `create` and `rehydrate` factories.

## 3. Wallet, ledger, and OPENING

`POST /wallets`, uniqueness of `playerId` + `currency`, `OPENING` + `CREDIT` in the same SQL transaction when the initial balance is above zero. `GET /wallets/:id`. Test: balance equals the ledger reconstruction.

## 4. HTTP submit

`POST /wagering/transactions` with `Idempotency-Key`. `BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`. `SELECT FOR UPDATE` on the wallet. GET by internal id and by `(providerId, externalTransactionId)`. `POST /wallets/:id/reconciliation` does not repair.

## 5. Out-of-order reference

`PENDING_REFERENCE`. Worker every 2s. Backoff `1s × 2^n`, cap 60s, 12 attempts. Then `REJECTED` and `REFERENCE_NOT_FOUND`. Event `WagerTransactionPendingReference`.

## 6. SQS and inbox

The consumer reuses the use case. Inbox key `(consumerName, messageId)`. Ack only after commit. A business failure acks. A transient failure retries. A permanent failure goes to the DLQ. `SIGTERM` returns visibility or finishes the in-flight message.

## 7. Outbox and events

In the same SQL transaction: `WagerTransactionProcessed`, `WagerTransactionRejected`, `WalletBalanceChanged` only when the balance changed, `WagerTransactionPendingReference`. Publisher with `SKIP LOCKED`. Abstract `IntegrationEvent`. `data` carries `MoneyProps`.

## 8. Observability

`SimpleLogger.child` on HTTP and SQS. Metrics: status, duplicate, retry, DLQ, lock conflict, outbox lag, latency. No financial payload.

## 9. Integration and concurrency

Real containers. The eight scenarios are in `docs/testing.md`. Invariant: `wallet.balance` equals the reconstructed ledger.

## 10. Evaluation docs

`README.md` already exists and stays short: the four folders and the stack. Each phase updates it with what landed. This phase adds setup, commands, environment, and `LOG_PRETTY`. Root `ARCHITECTURE.md` then describes only what is implemented: MikroORM, pessimistic lock, hash, failure taxonomy, `SimpleLogger`, auth as an extension, trade-offs, and limitations. FIFO is not the guarantee. Auth is a no-op. The happy path is `BRL`.
