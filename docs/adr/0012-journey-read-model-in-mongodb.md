# 0012. Keep the journey read model in MongoDB

- Status: Accepted
- Date: 2026-10-24

## Context

A caller wants to know what a request did, stage by stage: it entered the route, reached the use case, wrote the database or rolled back, and handed the event to the queue. The audit timeline answers "which events did this wager produce", but it is fed by the outbox events when the transition commits, so a pending reference or a rollback is not visible until the event lands, and it does not name the stage that spent the time.

The journey has different needs from the financial store and from the audit timeline. It is one observation per settled stage, it is queried by `flowId`, by `playerId` + `providerId`, by `stage` and `outcome`, and over a time range. It must never become a second source of truth for a balance, and a store that is unavailable must not add latency or fail a financial request.

## Decision

MongoDB stores a `journey_steps` collection, one document per settled stage.

- The stages are `ROUTE` (the HTTP interceptor), `USE_CASE` (the use case), `DATABASE` (the persistence writer), and `QUEUE` (the outbox publisher). Each outcome is `SUCCEEDED`, `FAILED`, or `ROLLBACK`.
- `flowId` groups one aggregate: a wager uses its `idempotencyKey`, a new wallet uses `opening:{walletId}`, and a read uses `read:{requestId}`. `playerId` and `providerId` are the other join keys, so a provider reads one player across requests.
- One document per `stepId`, unique, with indexes on `flowId`/`occurredAt`/`stepId`, `providerId`/`playerId`/`occurredAt`/`stepId`, and `providerId`/`occurredAt`/`stepId`.
- The `DATABASE` stage reports the transaction outcome, not each SQL statement. There is no trace of the ORM.
- `JourneyService.record` is fire-and-forget: it never throws and never awaits a caller. A store failure increments `journey_events_failures_total` and logs a warning; the financial answer is unchanged. A caller records through a concrete `JourneyService`, not through the store token directly.
- `JourneyStoreProtocol` and `JOURNEY_STORE` are owned by `application/journeys`; the Mongoose adapter lives only in `infrastructure/journey`, and the connection is `MongoConnection` in `infrastructure/mongo`, shared with the audit store.
- `GET /wagering/transactions/:transactionId/journey` is provider-scoped through the existing guard and answers `404` for another provider. `GET /providers/:providerId/players/:playerId/journey` answers `404` when the caller is not that provider. MongoDB is not part of `/health/ready`.

## Consequences

- The financial path is independent of the journey store. A MongoDB outage loses the observation of that step, not the money.
- The journey is eventually consistent: a step appears after the stage settles, and a lost step is lost forever because there is no `STARTED` row to retry. The delivery accepts that: a pending `STARTED` document would double every stage and hide the duration.
- Two stores operate for observability, and a production deployment sizes the collection and adds a TTL index. There is no sampling and no retention policy in the code.
- Every consumer joins the same outcome vocabulary (`SUCCEEDED`, `FAILED`, `ROLLBACK`), so a stage does not invent a name.
- The queue stage is read from the outbox payload's `correlationId` and `data`, so the published event joins the same flow without a new message.
