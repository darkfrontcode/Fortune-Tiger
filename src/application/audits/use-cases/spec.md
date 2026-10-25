# Audit use cases

`find-wager-audit.use-case.ts` holds `FindWagerAuditUseCase`, the application-level query for the recorded history of one wager.

`execute` receives `wagerId`, the optional `eventType`, `from`, `to`, and `limit`. It normalizes the limit to the default `50` when it is absent and to the cap `100` when it is larger, then calls `AUDIT_STORE.timeline`. The answer is `{ items }` in the order the store returns: `occurredAt` ascending, `eventId` as the deterministic tie-break.

An empty answer is valid: a wager with no recorded events answers an empty timeline, and a missing wager is the route's concern, not this use case's.

The use case receives `AUDIT_STORE` by token and is `@Injectable()`. It imports nothing from infrastructure.

Unit tests live in `tests/find-wager-audit.use-case.test.ts`. They cover the default limit, the cap, the filters that reach the store, and the empty timeline.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
