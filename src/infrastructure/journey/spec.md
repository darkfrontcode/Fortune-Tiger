# Journey store

MongoDB stores the journey steps. It is not a second source of truth: the wallet, the ledger, the wager, and the outbox stay in PostgreSQL. A step is an observation, so a step that never settles is lost and the financial state is still correct.

The connection is `MongoConnection`, owned by `src/infrastructure/mongo` and shared with the audit store.

## Document

`journey-step.schema.ts` holds the `journey_steps` collection, one document per settled stage. The fields are the `JourneyType.Schema` fields, with `stepId` unique. `_id` stays the Mongo identifier, and `versionKey` and `timestamps` are off because the contract owns `occurredAt`.

Indexes follow the query patterns:

| Index | Query |
| --- | --- |
| `{ stepId: 1 }` unique | one delivered step, never twice |
| `{ flowId: 1, occurredAt: 1, stepId: 1 }` | one aggregate, in order |
| `{ providerId: 1, playerId: 1, occurredAt: 1, stepId: 1 }` | one caller across requests |
| `{ providerId: 1, occurredAt: 1, stepId: 1 }` | one provider over a time range |

No generic query framework and no additional index. Mongoose keeps `autoIndex` on; a production deployment would create the same indexes as a migration and add a TTL index.

## Repository

`journey.repository.ts` holds `JourneyRepository`, the adapter of `JourneyStoreProtocol`. `record` inserts one document. A duplicate-key error on `stepId` leaves the method, because a repeated step is a defect, not a redelivery. `timeline` builds the filter from `providerId`, `flowId`, `playerId`, `stage`, `outcome`, and the `from`/`to` range, sorts by `occurredAt` ascending and `stepId` ascending, and applies `query.limit`.

The adapter never retries and never sleeps. There is no queue behind the journey write: a failed step is counted and dropped, and the next request records again.

## Module

`journey.store.module.ts` holds `JourneyStoreModule`. It imports `MongoModule`, provides `JourneyRepository`, binds `JOURNEY_STORE` with `useExisting`, and exports the token. `JourneysModule` imports it.

## Tests

Unit tests cover the recorder and the query through a fake `JourneyStoreProtocol`. Integration tests in `tests/` use a real MongoDB, created by the `mongo` compose service and the CI service: insertion, duplicate delivery, ordering, the filters, and an unavailable store. They run with `bun run test:journey`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
