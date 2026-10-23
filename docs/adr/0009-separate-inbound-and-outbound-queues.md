# 0009. Separate inbound commands from outbound events

- Status: Accepted
- Date: 2026-10-23

## Context

The first delivery used one FIFO queue for both directions. A request entered through `wager-transactions.fifo`, and the outbox published its integration events to the same queue. The consumer recognised an event by the shape of the body and acked it.

That works for one process, and it mixes two producers with different guarantees. A poison request that keeps returning can sit in front of an event. The consumer's receive budget is spent on messages it must discard. A downstream reader competes with the API for the same messages, and the retry and dead-letter policy of a request is applied to an event that has no request semantics. Scaling the consumer also scales the publisher, although the two have no reason to grow together.

## Decision

The channel has two queues.

- `wager-transactions.fifo` is inbound. `SqsQueue` receives, deletes, changes visibility, and dead-letters there.
- `wager-events.fifo` is outbound. `SqsPublisher` sends every integration event there.
- Both are FIFO. `MessageGroupId` is the aggregate id and `MessageDeduplicationId` is the event id in both directions, so one wallet keeps its order.
- The URLs arrive through `SQS_QUEUE_URL` and `SQS_EVENTS_QUEUE_URL`, built into `QUEUE_CONFIG` and `PUBLISH_CONFIG` by the same factory.
- A message stays self-describing: a request carries `type`, an event carries `eventType`, so an operator can move one between queues without guessing.

The split changes no financial rule. Uniqueness is still the inbox row, the idempotency key, and the provider pair in Postgres.

## Consequences

- A poison request cannot delay an event, and the consumer spends its budget on requests only.
- The publisher and the consumer scale independently, and a deployment can run one without the other.
- A downstream reader drains `wager-events.fifo` without touching the API's inbound channel.
- One more queue is provisioned in compose, the LocalStack script, and the pipeline.
- `outbox_lag_milliseconds` now describes the events channel alone, which is the number an operator wants.
- The consumer no longer receives events at all. The guard that acks a non-request body stays as a defence in depth, not as the design.
