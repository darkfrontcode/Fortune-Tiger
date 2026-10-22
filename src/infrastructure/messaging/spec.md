# Messaging

FIFO queues on LocalStack. The statement also allows MiniStack. Decision: LocalStack.

- `wager-transactions.fifo`
- `wager-transactions-dlq.fifo`

FIFO is an optimization. Uniqueness and the inbox live in Postgres.

## Layout

`messaging` has six folders. `events/` holds the integration event contract in `integration-event.ts` and `types.ts`, plus one folder per concept that records an event: `events/wager` and `events/wallet`. Each concept folder holds its events, its `types.ts` with `{Concept}EventType`, and an `index.ts`. `messages/` holds the inbox row, the outbox row, the inbound wager request, its guard, and its error text. `mappers/` holds the projection from a wager to outbox rows and the projection from a wager request to a transaction input. `publishers/` holds the outbox publisher, the SQS adapter, and the worker. `consumers/` holds the SQS queue adapter, the SQS consumer, the wager consumer, its outcome enum, its types, and the queue readiness probe. `factories/` builds the SQS client and the `ConsumerType.Config` from the environment. A namespace lives in the `types.ts` of the concept that owns it. `index.ts` reexports the child folders with `export *`.

## Inbox

`messages/inbox-message.ts` holds `InboxMessage`. Its types live in `messages/types.ts`, in `InboxMessageType`. `receive` stores `messageId`, `consumerName`, `payloadHash`, and `receivedAt`. `isProcessed` reads `processedAt`. `markProcessed` sets it. `rehydrate` only rebuilds.

Uniqueness is `(consumerName, messageId)`. The inbox row joins the same SQL transaction as the wager, the wallet, the ledger, and the outbox. Ack happens only after that commit.

This is queue deduplication. It is not a wager rule. The wager rule is in `src/application/idempotencies/spec.md`.

## Outbox

`messages/outbox-message.ts` holds `OutboxMessage`. Its types live in `messages/types.ts`, in `OutboxMessageType`. `enqueue` receives one `IntegrationEvent` and takes `eventId`, `aggregateId`, `eventType`, `occurredAt`, and `toJSON()` from it. The row id is the event id. `isPending` is true until `publishedAt` is set. `isDue` is true when `nextAttemptAt` is absent or not after now. `scheduleRetry` increments `attempts` and sets `nextAttemptAt` to now plus `1s × 2^(attempts - 1)`, capped at 60 seconds. `markPublished` sets `publishedAt`. `rehydrate` only rebuilds. The mapper turns a null column into the absent field.

`mappers/wager-events.mapper.ts` holds `WagerEventsMapper`, and it implements `MapperProtocol`. It reads the status the use case left on the wager and returns the rows to enqueue. `PROCESSED` with a ledger row returns `WagerTransactionProcessed` and `WalletBalanceChanged`. `PROCESSED` without a ledger row (`LOSS`) returns only `WagerTransactionProcessed`. `REJECTED` returns `WagerTransactionRejected`. `PENDING_REFERENCE` returns `WagerTransactionPendingReference`. Any other status returns nothing.

A retry that is still missing updates `attempts` and `next_attempt_at` and does not enqueue a second `WagerTransactionPendingReference`. Exhaustion reaches `REJECTED` and enqueues `WagerTransactionRejected`.

`correlationId` is the wager `idempotencyKey`. `causationId` is the queue `messageId` when the entry is the queue, and absent when it is not.

The row is inserted in the same SQL transaction as the business change. Publishing to SQS stays outside that transaction, in the publisher transaction.

## Publisher

`publishers/outbox.publisher.ts` holds `OutboxPublisher`. `publish` receives `at` and `limit`, opens one SQL transaction, and claims due rows with `SELECT ... FOR UPDATE SKIP LOCKED`. A row is due when `publishedAt` is absent and `nextAttemptAt` is absent or not after `at`. Rows are ordered by `occurredAt` and limited by the caller. The batch stays inside the transaction, and the limit keeps the lock window small.

Each row is published through `PublisherProtocol` from `src/application/protocols`. `publishers/sqs.publisher.ts` holds `SqsPublisher`, which sends the envelope to `wager-transactions.fifo`. `MessageGroupId` is `aggregateId`, so one aggregate keeps its order. `MessageDeduplicationId` is the event id.

A published row calls `markPublished(at)`. A failed publish calls `scheduleRetry(at)`, and the batch continues. The transaction commits the published and the retry state together. A process that dies before the commit leaves the rows pending for another publisher. A process that dies after the send and before the commit republishes; the consumer inbox deduplicates.

`publishers/outbox.worker.ts` holds `OutboxWorker`. It ticks every 2 seconds and calls `OutboxPublisher.publish` with `limit` 20. `open` starts one timer; `close` stops it. A failed batch goes to the logger as a warning.

There is no outbox dead-letter. A failed row keeps retrying with the `1s × 2^(attempts - 1)` backoff capped at 60 seconds. `attempts` and `nextAttemptAt` are the control.

The target is `wager-transactions.fifo`, the main FIFO queue in the statement. Integration events share it with `WagerTransactionRequested`. An integration event carries `eventType`; a request carries `type`. The consumer separates them by that field. FIFO is an optimization; uniqueness stays in Postgres.

## Integration event

`events/integration-event.ts` holds the abstract `IntegrationEvent<Data>`: a `schema` received by the protected constructor and one getter per field. Facts are `enqueue`, `rehydrate`, and `from`. One subclass per event, one file per subclass, inside the folder of the concept that records it: `events/wager/wager-transaction-processed.event.ts`, `events/wager/wager-transaction-rejected.event.ts`, `events/wager/wager-transaction-pending-reference.event.ts`, and `events/wallet/wallet-balance-changed.event.ts`. The class name is the event type. `eventType` and `version` are `readonly` fields on that class. The contract types live in `events/types.ts`, in `IntegrationEventType`. The `data` shape of each event lives in the concept folder: `events/wager/types.ts` in `WagerEventType`, and `events/wallet/types.ts` in `WalletEventType`. `toJSON` stores this envelope: `eventId`, `eventType`, `aggregateId`, `correlationId`, optional `causationId`, `occurredAt` as ISO-8601, `version`, and `data`. `data` uses `MoneyType.Output` (decimal string), never the `Money` instance.

| Event | When | `data` |
| --- | --- | --- |
| `WagerTransactionProcessed` | applied, including `LOSS` | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `status`, `money` |
| `WagerTransactionRejected` | rejected by a business rule | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `kind`, `status`, `failureCode` |
| `WalletBalanceChanged` | only when the balance changed | `walletId`, `transactionId`, `direction`, `money`, `balanceBefore`, `balanceAfter`, `walletVersion` |
| `WagerTransactionPendingReference` | reference is missing | `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `kind`, `status` |

A processed `LOSS` publishes `WagerTransactionProcessed` and does not publish `WalletBalanceChanged`. The use case decides that. See `src/application/transactions/spec.md`.

## Consumer

`consumers/sqs.queue.ts` holds `SqsQueue`, the SQS adapter. `receive` long-polls `wager-transactions.fifo` with `WaitTimeSeconds` 20, `MaxNumberOfMessages` 10, and `VisibilityTimeout` 30. It returns `ConsumerType.QueueMessage`: `sqsMessageId`, `receiptHandle`, `body`, and `receiveCount` from `ApproximateReceiveCount`. `delete` acks. `changeVisibility` sets the retry delay. `deadLetter` sends the original body to `wager-transactions-dlq.fifo` with `MessageGroupId` and `MessageDeduplicationId` equal to the envelope `messageId`.

`consumers/wager.consumer.ts` holds `WagerConsumer`. `consume` receives one queue message and the receive time. It parses the body through `WagerRequest`, maps through `WagerRequestMapper`, and calls `SubmitWagerUseCase.execute` with the inbox envelope. A body that is not a request is acked. A parse failure is permanent and goes to the DLQ. A use case failure retries until the limit. `ConsumerOutcome` lives in `consumers/enums/consumer-outcome.enum.ts` and holds `ACK`, `RETRY`, and `DEAD_LETTER`.

`messages/wager-request.ts` holds `WagerRequest`. `from` receives the body. It parses the JSON, returns nothing for an integration event, and returns a `WagerRequest` otherwise. `WagerRequestGuard` checks `messageId`, `type`, `occurredAt`, `data`, kind, money, and reference. Malformed JSON, a missing field, an unknown kind, an invalid money, and a missing reference for `REFUND` or `ROLLBACK` throw `Error` with `INVALID_WAGER_REQUEST_MESSAGE` from `messages/data/messages.data.ts`. Its types live in `messages/types.ts`, in `WagerRequestType`.

`mappers/wager-request.mapper.ts` holds `WagerRequestMapper`, and it implements `MapperProtocol`. It maps a valid `WagerRequest`, the consumer name, and the receive time to `TransactionsType.SubmitInput`. The request id is a new UUIDv7. `at` is the request `occurredAt`. The receive time goes to the inbox row.

The inbox `messageId` is the envelope `messageId`, not the SQS id. The use case commits the inbox row with the wager, the wallet, the ledger, and the outbox. `ACK` happens only after `SubmitWagerUseCase.execute` resolves. A resolved `REJECTED` is a business rule and is acked.

The attempt limit before the DLQ is 5. A transient failure under the limit returns `RETRY`; the consumer changes the visibility to `1s × 2^(receiveCount - 1)`, capped at 60 seconds. A transient failure on the fifth receive returns `DEAD_LETTER`. A permanent failure returns `DEAD_LETTER` immediately. A failed DLQ send does not ack; the message returns after the visibility timeout. A failed ack redelivers, and the inbox deduplicates.

`consumers/sqs.consumer.ts` holds `SqsConsumer`. `open` starts one long-poll loop. `close` stops the loop and awaits the in-flight batch. A process killed before the commit or before the ack leaves the message for redelivery, and the inbox keeps the effect single. The boot wires `SIGTERM` to `close`.

The message envelope is `messageId`, `type`, `occurredAt`, and `data`. `type` is `WagerTransactionRequested`. `data` carries the wager fields plus `idempotencyKey`. The consumer calls the use case in `src/application/transactions`.

| Error | Destination |
| --- | --- |
| Business, terminal | ack |
| Transient under the limit | retry with backoff |
| Permanent, or transient on the fifth receive | DLQ |

Redelivery does not duplicate the effect.

The publisher reads due outbox rows with `FOR UPDATE SKIP LOCKED`. Several publishers do not lose an event and do not republish forever without control. Death after commit and before publish: another instance publishes. A duplicate publish stays safe for the consumer.

Events are not published before the financial commit.

## Module

`messaging.module.ts` imports `EnvironmentModule`, `PersistenceModule`, `TransactionsModule`, and `ObservabilityModule`, and it provides the whole channel. `SQSClient` and the `QUEUE_CONFIG` token are built once from `Environment`; the token lives beside `createQueueConfig` in `factories/queue.factory.ts`.

`SqsQueue`, `SqsPublisher`, `QueueReadiness`, `OutboxPublisher`, `OutboxWorker`, `WagerConsumer`, and `SqsConsumer` are `@Injectable()`. They receive `SQSClient` and `MikroORM` by class token, `CLOCK`, `LOGGER`, and `PUBLISHER` by their tokens, and `QUEUE_CONFIG` for the queue URLs and the poll limits. `SqsPublisher` is bound to `PUBLISHER` with `useExisting`.

`PUBLISHER` is owned by messaging and lives in `tokens/`. `CLOCK` and `LOGGER` are cross-cutting tokens from `application/dependencies/tokens`.

The consumer name is `wager`. It is the `CONSUMER_NAME` token in `consumers/consumer-name.token.ts`, bound with `useValue`, and `WagerConsumer` receives it in the constructor.

`OutboxWorker`, `SqsConsumer`, and `QueueReadiness` are exported. `RuntimeService` is not: the root provides it, because it starts all three workers.

## Environment

`Environment` is the only reader of the variables below. `AWS_REGION` defaults to `us-east-1`, and `AWS_ENDPOINT_URL` points to LocalStack. `SQS_QUEUE_URL` and `SQS_DEAD_LETTER_QUEUE_URL` carry the absolute queue URLs. The consumer name is `wager`. `factories/sqs.factory.ts` builds the client with `maxAttempts` 1, and `factories/queue.factory.ts` builds the `ConsumerType.Config`: `maxMessages` 10, `waitTimeSeconds` 20, `visibilityTimeout` 30.

Compose starts Postgres 16 and LocalStack, and the ready script in `docker/localstack` creates `wager-transactions.fifo` and `wager-transactions-dlq.fifo`. The queue is FIFO, and the deduplication id is the event id.

The boot starts `OutboxWorker`, `ReferenceWorker`, and `SqsConsumer` once, and the shutdown closes them in that order. A close that throws goes to the logger as a warning, and the shutdown continues.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
