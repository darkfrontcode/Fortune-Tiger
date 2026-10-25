# 0011. Keep the audit timeline in MongoDB

- Status: Accepted
- Date: 2026-10-24

## Context

The wager lifecycle is a sequence: a request arrives, a reference may be missing, the wager is processed or rejected, and the wallet balance may change. PostgreSQL stores the financial state, and the outbox already records one integration event per transition. Reading that sequence back from the transactional tables couples an audit query to the write model: the tables are shaped for the lock and the uniqueness rule, not for a timeline.

The audit read model has different needs from the financial store. It is append-only, it is queried by `wagerId`, `correlationId`, `eventType`, and a time range, and a late event is acceptable. It must never become a second source of a balance, and a store that is unavailable must not roll back a wager.

## Decision

MongoDB holds an append-only `audit_events` collection.

- The audit consumer reads `wager-events.fifo`, the channel the outbox already publishes to. No new broker and no new producer are added.
- One document per `eventId`, with a unique index on `eventId`. A duplicate delivery answers as a successful duplicate instead of writing twice.
- The document carries `eventId`, `eventType`, `eventVersion`, `occurredAt`, `recordedAt`, `wagerId`, `correlationId`, `causationId`, `source`, `actor`, and a small `metadata` of `status`, `kind`, and `direction`. Amounts, balances, and personal data stay out.
- `recordedAt` is the consumer clock; `occurredAt` is the event time, so the timeline orders by when the event happened, with `eventId` as the deterministic tie-break.
- A temporary MongoDB failure returns the message to the queue with the existing backoff, and the fifth receive moves it to `wager-events-dlq.fifo`. An invalid event goes there immediately.
- The application owns `AuditStoreProtocol`; the Mongoose adapter lives only in `infrastructure/audit`. The domain has no Mongo type.
- `GET /wagering/transactions/:transactionId/audit` is provider-scoped through the existing guard and answers `404` for another provider. MongoDB is not part of `/health/ready`.

## Consequences

- The financial path is independent of the audit store. A MongoDB outage delays the timeline and never fails a wager.
- The timeline is eventually consistent: an event appears after the financial commit and after the outbox publishes it. The API documents this and the test polls for it.
- Two stores must be operated, backed up, and secured. The delivery accepts that cost because the audit query and the financial write have different shapes.
- A lost or dead-lettered event is visible in `audit_events_failures_total` and in the events dead-letter queue. It is not silently discarded.
- The audit consumer is the only reader of `wager-events.fifo` and acks each event after the document exists. A provider that also wants the raw stream needs a second queue or an SNS fan-out first; stealing the ack would starve the other reader.
- The audit collection is not a ledger. Reconciliation still compares the wallet with the PostgreSQL ledger, never with MongoDB.
