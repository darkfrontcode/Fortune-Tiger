# Audits

MongoDB is the audit store, not a second source of truth. PostgreSQL keeps the wallet, the ledger, the wager, and the outbox. An audit write never joins the financial SQL transaction, and a MongoDB outage never rolls back a committed financial change.

## Contract

`types.ts` holds `AuditType`. `Event` is the versioned audit event: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `recordedAt`, `wagerId`, `correlationId`, `causationId`, `source`, `actor`, and `metadata`. `occurredAt` and `recordedAt` are UTC dates. `wagerId`, `causationId`, and `actor` are absent when the event does not carry them.

`metadata` is a flat string map with the approved event attributes (`status`, `kind`, `direction`). It never carries an amount, a balance, a token, or a header.

`Query` filters by `wagerId`, `correlationId`, `eventType`, and the `from`/`to` range on `occurredAt`. The reader orders by `occurredAt` and breaks a tie with `eventId`, so a timeline is deterministic.

`record` answers `PERSISTED` or `DUPLICATE`; a duplicate is a successful outcome, not an error. `AuditOutcome` lives in `enums/`.

## Port

`protocols/audit.store.protocol.ts` owns `AuditStoreProtocol`, and `tokens/audit.store.token.ts` owns `AUDIT_STORE`. The adapter is `AuditEventRepository` in `infrastructure/audit`. The application does not import Mongo, Mongoose, or a document type.

## Use case

`use-cases/find-wager-audit.use-case.ts` holds `FindWagerAuditUseCase`. It receives `wagerId`, the optional `eventType`, `from`, `to`, and `limit`, asks `AUDIT_STORE`, and returns `{ items }`. The default limit is 50 and the cap is 100. An empty timeline is a valid answer.

The HTTP route refuses to show a timeline to a provider that does not own the wager; that access rule lives in the presentation, and the use case answers for the wager id it receives.

## Module

`audits.module.ts` imports `AuditStoreModule` and provides and exports `FindWagerAuditUseCase`. The HTTP module calls that use case. The messaging module writes through `AUDIT_STORE`; the audit consumer is the only writer.

An audit event is not a financial fact. The outbox emits it after the PostgreSQL commit, and the audit consumer stores it at least once. A repeated delivery is deduplicated by the unique `eventId`, so the timeline keeps one row per event.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
