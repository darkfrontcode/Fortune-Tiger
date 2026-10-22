# Publishers

This folder owns the outbox publisher and its SQS adapter. `PublisherProtocol` is an infrastructure-internal contract consumed by `OutboxPublisher`; `SqsPublisher` implements it without exposing a queue-specific type to the consumer.
