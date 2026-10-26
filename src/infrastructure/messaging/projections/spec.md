# Projections

One projection per wager status, chosen by a status-keyed registry. Factory Method.

`WagerProjectionProtocol` is the projection contract and lives in `wager.projection.protocol.ts`. Each concrete projection `project`s an event payload into the outbox messages that record it.

- `RejectedProjection` enqueues `WagerTransactionRejected`.
- `PendingReferenceProjection` enqueues `WagerTransactionPendingReference`.
- `ProcessedProjection` enqueues `WagerTransactionProcessed`, and adds `WalletBalanceChanged` when a ledger row exists.
- `EmptyProjection` returns nothing for a status that records no event.

`WagerEventsMapper` in `mappers/` keeps one `Map` keyed by `WagerTransactionStatus` and delegates to the projection that owns the status. A new status adds one projection and one map entry; the mapper does not grow a branch.

`types.ts` holds `WagerProjectionType` with the shared `Input` and `Output` shapes. The protocol and each projection are pure classes; the mapper builds the registry once.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
