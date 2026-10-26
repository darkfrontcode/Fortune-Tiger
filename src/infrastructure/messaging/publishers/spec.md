# Publishers

This folder owns the outbox publisher and its SQS adapter. `PublisherProtocol` lives in `protocols/` and is consumed by `OutboxPublisher`; `SqsPublisher` implements it without exposing a queue-specific type to the consumer.

`SqsPublisher` writes to the outbound channel, `wager-events.fifo`, and reads its URL from `PublisherType.Config` in `types.ts`. `PUBLISH_CONFIG`, in `tokens/`, carries the value built by `QueueFactory.publish()` from `SQS_EVENTS_QUEUE_URL`. The inbound queue belongs to `queues/`, so a change to one direction never moves the other.

`MeasuredPublisher` decorates `SqsPublisher`: it receives the inner publisher by class, `METRIC`, and `CLOCK`, and wraps `publish` so every send counts `events_published_total` and observes `events_publish_milliseconds`. `messaging.module.ts` binds `PUBLISHER` with `useExisting` over `MeasuredPublisher`, keeping `SqsPublisher` provided by class as the decorated target, so the outbox keeps observing every publish without the adapter knowing.
