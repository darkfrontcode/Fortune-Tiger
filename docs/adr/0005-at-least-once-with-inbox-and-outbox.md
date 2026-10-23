# 0005. Deliver at least once with a transactional inbox and outbox

- Status: Accepted
- Date: 2026-10-23

## Context

The queue delivers at least once, a process can die at any point, and a consumer can receive the same message twice. The financial effect must stay single, and an event must never leave before the change it describes is durable.

An exactly-once guarantee across two systems is not available without distributed transactions.

## Decision

The inbox, the wager, the wallet, the ledger, and the outbox commit in **one SQL transaction**. The ack happens after that commit, and the publisher sends after it, outside the transaction.

- Uniqueness is `(consumer_name, message_id)` in `inbox_messages`, `idempotency_key` in `wager_transactions`, and `(provider_id, external_transaction_id)` in the same table. The database decides, not the process.
- The outbox row is written in the business transaction and claimed with `SELECT ... FOR UPDATE SKIP LOCKED`. Several publishers do not lose an event and do not republish forever.
- FIFO is an optimisation: `MessageGroupId` is the aggregate id, so one wallet keeps its order and two wallets may interleave.
- Retry is data, not a loop: `attempts` and `next_attempt_at` follow `1s × 2^(attempts - 1)`, capped at 60 seconds, on the outbox and on a pending reference.
- The consumer moves a message to the dead-letter queue on the fifth receive or on a permanent failure. The outbox has no dead-letter; it keeps retrying, and `outbox_lag_milliseconds` makes a backlog visible.

## Consequences

- A crash after the commit and before the ack redelivers the message, and the inbox keeps the effect single.
- A publisher that dies after the send republishes, and the consumer inbox deduplicates.
- Delivery is at least once end to end. Exactly once is not claimed, because it is not true.
- The inbox grows with traffic. A retention job is out of this delivery and would be the first operational task.
