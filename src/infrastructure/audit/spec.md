# Audit store

MongoDB stores the audit timeline. It is not a second source of truth: the wallet, the ledger, the wager, and the outbox stay in PostgreSQL.

## Connection

`MongoConnection` lives in `src/infrastructure/mongo`, next to `MongoModule`, because the audit store and the journey store share one connection and one pool. The connection never awaits the server: an unreachable MongoDB does not stop the boot and does not touch a financial operation. `bufferCommands` is `false` and the server selection timeout is two seconds, so a write or a read fails instead of waiting in memory. A connection error goes to `LOGGER` as a warning, without a document or a payload.

The connection closes on application shutdown. There is no MongoDB probe in `/health/ready`: a store that is allowed to be unavailable must not take the API out of the load balancer.

## Document

`audit-event.schema.ts` holds the `audit_events` collection, one document per audit event. The document fields are the `AuditType.Event` fields, with `eventId` unique. `_id` stays the Mongo identifier, and `versionKey` and `timestamps` are off because the contract owns `eventVersion` and `recordedAt`.

Indexes follow the query patterns:

| Index | Query |
| --- | --- |
| `{ eventId: 1 }` unique | deduplication and a direct event read |
| `{ wagerId: 1, occurredAt: 1, eventId: 1 }` | one wager's timeline |
| `{ correlationId: 1, occurredAt: 1, eventId: 1 }` | one request or workflow across wagers |
| `{ eventType: 1, occurredAt: 1, eventId: 1 }` | one event type over a time range |

No generic query framework and no additional index. Mongoose keeps `autoIndex` on; a production deployment would create the same indexes as a migration.

## Repository

`audit-event.repository.ts` holds `AuditEventRepository`, the adapter of `AuditStoreProtocol`. `record` inserts one document. A duplicate-key error on `eventId` answers `DUPLICATE`; every other error leaves the method, so the consumer retries. `timeline` builds the filter from `wagerId`, `correlationId`, `eventType`, and the `from`/`to` range, sorts by `occurredAt` ascending and `eventId` ascending, and applies `query.limit`.

The adapter never retries and never sleeps. Retry and dead-letter belong to the queue consumer.

## Module

`audit.store.module.ts` holds `AuditStoreModule`. It imports `MongoModule`, provides `AuditEventRepository`, binds `AUDIT_STORE` with `useExisting`, and exports the token. `MessagingModule` and `AuditsModule` import it.

## Tests

Unit tests cover the consumer through a fake `AuditStoreProtocol`. Integration tests in `tests/` use a real MongoDB, created by the `mongo` compose service and the CI service: insertion, duplicate delivery, ordering, the filters, and an unavailable store. They run with `bun run test:audit`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
