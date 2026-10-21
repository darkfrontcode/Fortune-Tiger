# Messaging

FIFO queues on LocalStack. The statement also allows MiniStack. Decision: LocalStack.

- `wager-transactions.fifo`
- `wager-transactions-dlq.fifo`

FIFO is an optimization. Uniqueness and the inbox live in Postgres.

## Layout

`messaging` has three folders. `events/` holds the integration event contract in `integration-event.ts` and `types.ts`, plus one folder per concept that records an event: `events/wager` and `events/wallet`. Each concept folder holds its events, its `types.ts` with `{Concept}EventType`, and an `index.ts`. `messages/` holds the inbox row and the outbox row. `mappers/` holds the projection from a wager to outbox rows. A namespace lives in the `types.ts` of the concept that owns it. `index.ts` reexports the child folders with `export *`.

## Inbox

`messages/inbox-message.ts` holds `InboxMessage`. Its types live in `messages/types.ts`, in `InboxMessageType`. `receive` stores `messageId`, `consumerName`, `payloadHash`, and `receivedAt`. `isProcessed` reads `processedAt`. `markProcessed` sets it. `rehydrate` only rebuilds.

Uniqueness is `(consumerName, messageId)`. The inbox row joins the same SQL transaction as the wager, the wallet, the ledger, and the outbox. Ack happens only after that commit.

This is queue deduplication. It is not a wager rule. The wager rule is in `src/application/idempotencies/spec.md`.

## Outbox

`messages/outbox-message.ts` holds `OutboxMessage`. Its types live in `messages/types.ts`, in `OutboxMessageType`. `enqueue` receives one `IntegrationEvent` and takes `eventId`, `aggregateId`, `eventType`, `occurredAt`, and `toJSON()` from it. The row id is the event id. `isPending` is true until `publishedAt` is set. `isDue` is true when `nextAttemptAt` is absent or not after now. `scheduleRetry` increments `attempts` and sets `nextAttemptAt` to now plus `1s × 2^(attempts - 1)`, capped at 60 seconds. `markPublished` sets `publishedAt`. `rehydrate` only rebuilds.

`mappers/wager-events.mapper.ts` holds `WagerEventsMapper`, and it implements `MapperProtocol`. It reads the status the use case left on the wager and returns the rows to enqueue. `PROCESSED` with a ledger row returns `WagerTransactionProcessed` and `WalletBalanceChanged`. `PROCESSED` without a ledger row (`LOSS`) returns only `WagerTransactionProcessed`. `REJECTED` returns `WagerTransactionRejected`. `PENDING_REFERENCE` returns `WagerTransactionPendingReference`. Any other status returns nothing.

`correlationId` is the wager `idempotencyKey`. `causationId` is the queue `messageId` when the entry is the queue, and absent when it is not.

The row is inserted in the same SQL transaction as the business change. Publishing to SQS stays outside that transaction.

## Integration event

`events/integration-event.ts` holds the abstract `IntegrationEvent<Data>`: a `schema` received by the protected constructor and one getter per field. Facts are `enqueue`, `rehydrate`, and `from`. One subclass per event, one file per subclass, inside the folder of the concept that records it: `events/wager/wager-transaction-processed.event.ts`, `events/wager/wager-transaction-rejected.event.ts`, `events/wager/wager-transaction-pending-reference.event.ts`, and `events/wallet/wallet-balance-changed.event.ts`. The class name is the event type. `eventType` and `version` are `readonly` fields on that class. The contract types live in `events/types.ts`, in `IntegrationEventType`. The `data` shape of each event lives in the concept folder: `events/wager/types.ts` in `WagerEventType`, and `events/wallet/types.ts` in `WalletEventType`. `toJSON` stores this envelope: `eventId`, `eventType`, `aggregateId`, `correlationId`, optional `causationId`, `occurredAt` as ISO-8601, `version`, and `data`. `data` uses `MoneyType.Output` (decimal string), never the `Money` instance.

| Event | When | `data` |
| --- | --- | --- |
| `WagerTransactionProcessed` | applied, including `LOSS` | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `status`, `money` |
| `WagerTransactionRejected` | rejected by a business rule | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `kind`, `status`, `failureCode` |
| `WalletBalanceChanged` | only when the balance changed | `walletId`, `transactionId`, `direction`, `money`, `balanceBefore`, `balanceAfter`, `walletVersion` |
| `WagerTransactionPendingReference` | reference is missing | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `kind`, `status` |

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
