# Messaging

FIFO queues on LocalStack. The statement also allows MiniStack. Decision: LocalStack.

- `wager-transactions.fifo`
- `wager-transactions-dlq.fifo`

FIFO is an optimization. Uniqueness and the inbox live in Postgres.

## Inbox

`InboxMessage.receive` stores `messageId`, `consumerName`, `payloadHash`, and `receivedAt`. `isProcessed` reads `processedAt`. `markProcessed` sets it. `rehydrate` only rebuilds.

Uniqueness is `(consumerName, messageId)`. The inbox row joins the same SQL transaction as the wager, the wallet, the ledger, and the outbox. Ack happens only after that commit.

This is queue deduplication. It is not a wager rule. The wager rule is in `src/application/idempotencies/spec.md`.

## Outbox

`OutboxMessage.enqueue` stores one integration event: `aggregateId`, `eventType`, `payload`, `occurredAt`. `isPending` is true until `publishedAt` is set. `isDue` compares `nextAttemptAt` with now. `scheduleRetry` increments `attempts` and sets the next `nextAttemptAt`. `markPublished` sets `publishedAt`. `rehydrate` only rebuilds.

The row is inserted in the same SQL transaction as the business change. Publishing to SQS stays outside that transaction.

## Integration event

`IntegrationEvent` is an abstract class. One subclass per event. `eventType` and `version` live on the type. `toJSON` stores this envelope: `eventId`, `eventType`, `aggregateId`, `correlationId`, optional `causationId`, `occurredAt` as ISO-8601, `version`, and `data`. `data` uses `MoneyProps` (decimal string), never the `Money` instance.

| Event | When |
| --- | --- |
| `WagerTransactionProcessed` | applied, including `LOSS` |
| `WagerTransactionRejected` | rejected by a business rule |
| `WalletBalanceChanged` | only when the balance changed |
| `WagerTransactionPendingReference` | reference is missing |

`WalletBalanceChanged` data is `walletId`, `transactionId`, `direction`, `money`, `balanceBefore`, `balanceAfter`, and `walletVersion`.

A processed `LOSS` publishes `WagerTransactionProcessed` and does not publish `WalletBalanceChanged`. The use case decides that. See `src/application/transactions/spec.md`.

The message envelope is `messageId`, `type`, `occurredAt`, and `data`. `type` is `WagerTransactionRequested`. `data` carries the wager fields plus `idempotencyKey`. The consumer calls the use case in `src/application/transactions`.

| Error | Destination |
| --- | --- |
| Business, terminal | ack |
| Transient | retry with backoff |
| Permanent, attempts exhausted | DLQ |

The statement requires an attempt limit before the DLQ. That number is not locked yet.

`SIGTERM`: finish what is in flight or return visibility. Redelivery does not duplicate the effect.

The publisher reads due outbox rows with `FOR UPDATE SKIP LOCKED`. Several publishers do not lose an event and do not republish forever without control. Death after commit and before publish: another instance publishes. A duplicate publish stays safe for the consumer.

Events are not published before the financial commit.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
