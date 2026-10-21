# Infrastructure

Postgres, SQS, workers, clock, logger, and metrics. It does not decide a wager rule.

There is no `shared` folder here. A technical contract lives in `protocols`. `TheoryProtocol` lives there. This layer does not import `presentation`.

Each folder has an English `spec.md`. The code follows that spec. One adapter, one spec. Inbox and outbox stay inside `messaging`, not in their own folders. Small files.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `persistence` — MikroORM, schema, lock
- `messaging` — one spec: queue, consumer, inbox, outbox, and the event envelope
- `observability` — `SimpleLogger`, `ClockProtocol`, and metrics. A plug-in contract ends with `Protocol`.
- `protocols` — `TheoryProtocol`. The test case plugs `params` into `expected`. Not a wager rule.
