# 0003. Use PostgreSQL with MikroORM and pessimistic locking

- Status: Accepted
- Date: 2026-10-23

## Context

A wallet balance is a shared row. Two requests that read `100`, subtract `80`, and write `20` both succeed under a naive read-modify-write, and one debit disappears. The database also holds the money itself, so the numeric type and its scale are part of the contract.

The challenge prefers MikroORM and also accepts TypeORM; Prisma is excluded.

## Decision

PostgreSQL 16 stores the state, MikroORM 6 maps it, and every balance change runs inside `EntityManager.transactional()` with `LockMode.PESSIMISTIC_WRITE` on the wallet row. The SQL is `SELECT ... FOR UPDATE`, scoped to the wallet, inside the same transaction that writes the ledger entry, the wager, the inbox row, and the outbox row.

Money is `numeric(20,2)` and the currency is `char(3)`. Identifiers are UUIDv7, so the index stays close to insertion order and a ledger page can be ordered by `id` without a second column. Migrations are versioned and reversible, and each one is committed with the code that needs it.

The unique `transaction_id` on the ledger and the unique `(provider_id, external_transaction_id)` on the wager are the final guarantee: the lock lowers contention, the constraint decides.

## Consequences

- Two concurrent debits serialise on the wallet and never lose an update.
- The lock window is one transaction and one row, so two wallets do not block each other.
- A lock wait that times out or a deadlock increments `lock_conflicts_total` before the error leaves the writer, so the event is visible rather than silent.
- The wallet is the unit of concurrency. A workload concentrated on one wallet is limited by the row, not by the pool.
- Writing raw SQL is possible, but the rule stays in one writer per operation so there is one place to audit.
