# Audit outcomes

`audit-outcome.enum.ts` holds `AuditOutcome`: `PERSISTED` when the store wrote the event, and `DUPLICATE` when the unique `eventId` was already stored.

`DUPLICATE` is a successful duplicate delivery. The consumer acknowledges it and counts it, and it is not an error. The store adapter raises a duplicate-key error as `DUPLICATE`; every other failure leaves the adapter as an error so the queue retries.

`enums/index.ts` reexports the enum with `export *`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
