# Journeys

A journey is what happened to one caller, in order. The audit timeline answers "which events did this wager produce". The journey answers "what did this request do, stage by stage": it entered the route, it reached the use case, it wrote the database or rolled back, and it handed the event to the queue.

The journey is a read model. It lives in MongoDB, next to the audit timeline, and it never joins the financial SQL transaction. A slow or unavailable store delays the journey and never changes the answer a caller receives.

## Stages

`JourneyStage` lives in `enums/journey-stage.enum.ts`:

| Stage | Recorded by | `operation` |
| --- | --- | --- |
| `ROUTE` | `JourneyInterceptor` in the presentation | `POST /wagering/transactions` |
| `USE_CASE` | the use case | `SubmitWagerUseCase`, `OpenWalletUseCase` |
| `DATABASE` | the persistence writer | `wager_transactions`, `wallets` |
| `QUEUE` | the outbox publisher | `wager-events.fifo` |

`JourneyOutcome` lives in `enums/journey-outcome.enum.ts`. `SUCCEEDED` is a stage that settled as expected. `FAILED` is a stage that ended in an error or in a business refusal. `ROLLBACK` is a SQL transaction that was rolled back.

## Flow

`flowId` groups the stages of one aggregate, not of one HTTP request:

- a wager uses its `idempotencyKey`, the same value the outbox carries as `correlationId`, so the queue stage joins the same flow;
- a new wallet uses `opening:{walletId}`, the key of the `OPENING` transaction, so the route, the use case, the database, and the queue agree;
- a read uses `read:{requestId}`, because a read has no aggregate to hold the steps together.

`playerId` is the other join key. A caller's journey across many requests is the timeline filtered by `playerId` and `providerId`.

## Contract

`types.ts` holds `JourneyType`. `Schema` is one stored step: `stepId`, `flowId`, `stage`, `operation`, `outcome`, `occurredAt`, `durationMs`, `providerId`, `playerId`, `wagerId`, `walletId`, and `failureCode`. A field that the stage does not know is absent.

`occurredAt` is when the stage started. `durationMs` is how long it took to settle, so ordering by `occurredAt` reads as the story and the duration stays attached to the stage that spent the time.

`Input` is what the recorder receives: the same identifiers, `startedAt`, and the settled `outcome`. The recorder stamps `recordedAt` through `stepId` and the duration, so every caller reports the same shape.

`Query` filters by `flowId`, `playerId`, `providerId`, `stage`, `outcome`, and the `from`/`to` range on `occurredAt`. The reader orders by `occurredAt` and breaks a tie with `stepId`, so a journey is deterministic.

The journey never carries an amount, a balance, a token, a header, or a payload. `failureCode` is the domain code the wager already exposes.

## Port

`protocols/journey.store.protocol.ts` owns `JourneyStoreProtocol`, and `tokens/journey.store.token.ts` owns `JOURNEY_STORE`. The adapter is `JourneyRepository` in `infrastructure/journey`. The application does not import Mongo, Mongoose, or a document type.

## Recorder

`services/journey.service.ts` holds `JourneyService`. `record` builds the step with a fresh UUIDv7, takes the duration from `CLOCK`, and writes through `JOURNEY_STORE`. It never throws: a store failure increments `journey_events_failures_total`, logs `JOURNEY_STORE_FAILURE_MESSAGE`, and returns. A caller calls it without awaiting, so a MongoDB outage does not add latency to a financial request.

`data/messages.data.ts` holds the error text of this concept. `data/index.ts` reexports it.

## Use case

`use-cases/find-journey.use-case.ts` holds `FindJourneyUseCase`. It receives the `providerId`, an optional `flowId`, an optional `playerId`, the optional `stage`, `outcome`, `from`, and `to`, and the `limit`, asks `JOURNEY_STORE`, and returns `{ items }`. The default limit is 50 and the cap is 100. An empty journey is a valid answer.

The provider scope is enforced by the presentation, like the audit route: a caller reads only its own journeys. The use case answers for the `providerId` it receives.

## Module

`journeys.module.ts` imports `JourneyStoreModule` (for the store) and `ObservabilityModule` (for `CLOCK`, `LOGGER`, and `METRIC`), and provides and exports `JourneyService` and `FindJourneyUseCase`. The use cases, the presentation interceptor, the persistence writers, and the outbox publisher record through `JourneyService`; the HTTP module calls the use case.

## Limits

- One document per settled stage. A process killed before the stage settles leaves no document for that stage, because a `STARTED` row would double every stage and hide the duration.
- The store is not a trace of the ORM. The `DATABASE` stage reports the transaction outcome, not each statement.
- There is no sampling and no retention policy. A production deployment sizes the collection and sets a TTL index.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
