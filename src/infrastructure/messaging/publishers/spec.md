# Publishers

This folder owns the outbox publisher and its SQS adapter. `PublisherProtocol` is an infrastructure-internal contract consumed by `OutboxPublisher`; `SqsPublisher` implements it without exposing a queue-specific type to the consumer.

`SqsPublisher` writes to the outbound channel, `wager-events.fifo`, and reads its URL from `PublisherType.Config` in `types.ts`. `PUBLISH_CONFIG`, in `tokens/`, carries the value built by `createPublishConfig` from `SQS_EVENTS_QUEUE_URL`. The inbound queue belongs to `consumers/`, so a change to one direction never moves the other.
