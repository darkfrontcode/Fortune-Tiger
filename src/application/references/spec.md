# References

The scheduled retry of a wager that is waiting for its reference.

`use-cases/retry-references.use-case.ts` defines `RetryReferencesUseCase.execute`. It receives `{ at, limit }`, asks `ReferenceReaderProtocol.due` for the due transaction IDs, and calls `ReferenceGatewayProtocol.retry` in order. It returns `{ checked, processed, rejected, waiting }`.

`REFERENCE_READER` and `REFERENCE_GATEWAY` live in this context's `tokens/` folder.

`ReferenceMediator.retry` (in `transactions/wager/mediators/`) decides one due wager inside the SQL transaction:

- a reference that is absent or not terminal calls `wager.scheduleRetry(at)`;
- `wager.exhausted()` rejects with `REFERENCE_NOT_FOUND`;
- a terminal reference goes through `WagerMediator.mediate`.

The retry writer locks the wager by id and the wallet by id, applies the mediator, saves the wager, the wallet, and the ledger, and records the outbox row only when the status leaves `PENDING_REFERENCE`.

The worker ticks every 2 seconds. The limit per tick is 20. The worker stops on `close`.

No retry repairs a divergence. No retry applies a terminal wager again. A retry that is still missing does not enqueue a second `WagerTransactionPendingReference`.

Unit tests live in `use-cases/tests/retry-references-use-case.test.ts`.

## Module

`references.module.ts` imports `PersistenceModule`, provides `RetryReferencesUseCase`, and exports it. The use case is `@Injectable()` and receives `REFERENCE_READER` and `REFERENCE_GATEWAY` by token. `ReferenceWorker` stays out of this module: the root provides it, because it joins the use case with the clock, the logger, and a process loop. The worker is `@Injectable()` too.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
