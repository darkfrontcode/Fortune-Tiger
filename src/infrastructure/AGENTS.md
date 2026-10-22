# Infrastructure

Postgres, SQS, workers, clock, logger, and metrics. It does not decide a wager rule.

There is no `shared` folder here. Plug-in contracts live in `application/protocols`, not in this layer. This layer does not import `presentation`.

Each folder has an English `spec.md`. The code follows that spec. One adapter, one spec. Inbox and outbox stay inside `messaging/messages`, not in folders of their own. Small files.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `persistence` — MikroORM, schema, lock
- `messaging` — one spec: queue, consumer, inbox, outbox, and the event envelope
- `observability` — `SimpleLogger`, `ClockProtocol`, and metrics. A plug-in contract ends with `Protocol` and lives in `application/protocols` when it is shared across layers.
- `environment` — the only reader of `process.env`. One getter per variable, no business rule.

A module lives inside the folder it wires: `persistence.module.ts`, `messaging.module.ts`, `observability.module.ts`, `environment.module.ts`. It builds the adapters and binds their tokens from `application/tokens` with `useExisting`. A factory receives `Environment` and never reads a variable.

An adapter is `@Injectable()` and receives its collaborators in the constructor: `MikroORM` and `SQSClient` by their class token, a port by its token, and a primitive from `QUEUE_CONFIG`. A factory provider stays for the client and the value built from `Environment`. A pure collaborator that the adapter calls, such as a mediator or a mapper, is provided by the module that consumes it, so the module arrow does not become a cycle.
