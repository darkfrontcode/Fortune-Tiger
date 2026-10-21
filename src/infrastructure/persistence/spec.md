# Persistence

MikroORM. Unit of Work, Identity Map, `EntityManager.transactional()`, `LockMode`. Columns are `numeric(20,2)` and `currency char(3)`. Migrations are versioned and reversible. Identifiers are UUIDv7.

PostgreSQL 16. Section 4 of the statement excludes Prisma. This project uses MikroORM.

`SELECT FOR UPDATE` on the wallet inside the SQL transaction that also writes the ledger, the wager, the inbox, and the outbox. No global lock. No bare `read → calculate → update`. The schema constraint is the final guarantee.

Tables: `wallets`, `wager_transactions`, `wallet_ledger_entries`, `inbox_messages`, `outbox_messages`.

- `wallets`: unique `(player_id, currency)`; balance `>= 0`; `version >= 1`
- `wager_transactions`: unique `idempotency_key`; unique `(provider_id, external_transaction_id)`; `kind` and `status` as Postgres enums; scale 2
- `wallet_ledger_entries`: unique `transaction_id`; no update and no delete in the app; `balance_after` matches the direction
- `inbox_messages`: unique `(consumer_name, message_id)`
- `outbox_messages`: index `(published_at, next_attempt_at)`

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
