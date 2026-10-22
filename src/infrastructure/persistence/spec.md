# Persistence

MikroORM. Unit of Work, Identity Map, `EntityManager.transactional()`, `LockMode`. Columns are `numeric(20,2)` and `currency char(3)`. Migrations are versioned and reversible. Identifiers are UUIDv7.

PostgreSQL 16. Section 4 of the statement excludes Prisma. This project uses MikroORM.

`SELECT FOR UPDATE` on the wallet inside the SQL transaction that also writes the ledger, the wager, the inbox, and the outbox. No global lock. No bare `read → calculate → update`. The schema constraint is the final guarantee.

`ReferenceReader.due` selects `PENDING_REFERENCE` rows whose `next_attempt_at` is null or not after now, ordered by `next_attempt_at`, limited by the caller. `ReferenceRetryWriter.retry` locks the wager row and the wallet row with `SELECT FOR UPDATE`, then writes the wager, the wallet, the ledger, and the outbox in one SQL transaction. A retry that is still waiting writes only `attempts` and `next_attempt_at`.

`WalletReader.findById` opens a forked `EntityManager` and reads one wallet. `LedgerReader.page` reads the entries of one wallet ordered by `id`, which is UUIDv7, after the `id` in the cursor, up to the limit plus one row, so the page knows whether another row exists. The cursor is the base64url of the last `id`; a cursor that is not the base64url of a UUID answers nothing. `WagerReader` reads one wager by `id` or by `(provider_id, external_transaction_id)`. All three read only, and none of them locks a row.

`OutboxMessageRepository.findDueForUpdate` selects due `outbox_messages` with `FOR UPDATE SKIP LOCKED`, ordered by `occurred_at`, limited by the caller. The statement lives in `outbox/queries/find-due-for-update.query.ts`. `updateMany` writes `attempts`, `next_attempt_at`, and `published_at` for the batch in the same SQL transaction.

## Module

`persistence.module.ts` imports `EnvironmentModule` and `IdempotenciesModule`, and builds `MikroORM` from `environment.databaseUrl` with `useFactory`. The writers, the readers, and `DatabaseReadiness` are `@Injectable()` and receive `MikroORM` by its class token. `WagerSubmitWriter` also receives `IdempotencyService`, `WagerEventsMapper`, and `WagerMediator`. `ReferenceRetryWriter` receives `ReferenceMediator` and `WagerEventsMapper`. `WalletOpeningWriter` receives `IdempotencyService` and `WagerMediator`. The module provides those pure collaborators itself, because the SQL adapter calls them and `PersistenceModule` cannot import `WagersModule` without a cycle.

The persistence-owned adapters bind the tokens from their application contexts with `useExisting`, so one instance answers to both the port and adapter class: `WAGER_GATEWAY` is `WagerSubmitWriter`, `REFERENCE_READER` is `ReferenceReader`, `REFERENCE_GATEWAY` is `ReferenceRetryWriter`, `RECONCILIATION_GATEWAY` is `ReconciliationReader`, `WALLET_READER` is `WalletReader`, `WAGER_READER` is `WagerReader`, and `WALLET_OPENING` is `WalletOpeningWriter`. `LEDGER_READER` is bound to `LedgerReader` the same way. `MikroORM`, `DatabaseReadiness`, and the writers are exported. `WALLET_OPENING`, `WAGER_READER`, `WALLET_READER`, and `LEDGER_READER` are exported for the HTTP module.

`WagerBetWriter` is not part of the delivery: it only repeated `WagerSubmitWriter.submit`, and `WagerSubmitWriter` is the adapter.

A repository is built with the `EntityManager` of the transaction it serves, which is the Unit of Work. Its mapper is a pure helper, so the repository builds it with `new`.

Tables: `wallets`, `wager_transactions`, `wallet_ledger_entries`, `inbox_messages`, `outbox_messages`.

- `wallets`: unique `(player_id, currency)`; balance `>= 0`; `version >= 1`
- `wager_transactions`: unique `idempotency_key`; unique `(provider_id, external_transaction_id)`; `kind` and `status` as Postgres enums; scale 2; `attempts int not null default 0`; `next_attempt_at timestamptz null`; index `(status, next_attempt_at)`
- `wallet_ledger_entries`: unique `transaction_id`; no update and no delete in the app; `balance_after` matches the direction
- `inbox_messages`: unique `(consumer_name, message_id)`
- `outbox_messages`: index `(published_at, next_attempt_at)`

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
