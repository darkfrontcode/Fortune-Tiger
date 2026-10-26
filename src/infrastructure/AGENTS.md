# Infrastructure

Postgres, SQS, workers, clock, logger, and metrics. It does not decide a wager rule.

There is no `shared` folder here. Application ports are defined by the consuming application capability. A contract used only inside an infrastructure module stays beside its consumer. This layer does not import `presentation`.

Each folder has an English `spec.md`. The code follows that spec. One adapter, one spec. Inbox and outbox stay inside `messaging/messages`, not in folders of their own. Small files.

One folder per kind, and a folder holds only its own kind. `observability` splits into `clocks/` (`SystemClock`), `loggers/` (`SimpleLogger`), `metrics/` (`PrometheusMetric` and `SimpleMetric`), and `services/` (`LoggerService`). `messaging` splits into `consumers/`, `enums/`, `events/`, `factories/`, `mappers/`, `messages/`, `projections/`, `protocols/`, `publishers/`, `queues/`, `tokens/`, and `workers/`. Each subfolder has its own `index.ts`, and the module barrel reexports the subfolders.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `persistence` — MikroORM, schema, lock. One folder per kind: `entities/`, `mappers/`, `repositories/`, `readers/`, `writers/`, `workers/`, `queries/`, `factories/` (`OrmFactory`), and `readiness/` (`DatabaseReadiness`).
- `audit` — the Mongoose adapter for the append-only audit timeline. `AuditStoreModule` binds `AUDIT_STORE`; the application contract is owned by `application/audits`.
- `journey` — the Mongoose adapter for the per-caller journey. `JourneyStoreModule` binds `JOURNEY_STORE`; the application contract is owned by `application/journeys`.
- `mongo` — `MongoConnection` (`connections/`), the Mongoose connection shared by the audit adapter and the journey adapter.
- `search` — `OllamaEmbedding`, `MongoVectorSearch`, `SearchConnection`, and the `searchable_events` schema. The adapters satisfy `application/searches`; `SearchStoreModule` binds `EMBEDDING` and `VECTOR_SEARCH`. Read-only and never on the financial path. The CI pipeline for main and staging starts this stack (`atlas-local` plus Ollama), pulls the model, seeds, and exercises a real search on every run.
- `mcp` — `registerSearchTool`, the stdio Model Context Protocol wiring that exposes `search_similar_events` over `scripts/mcp.ts`. It runs out of the CI pipeline through `scripts/search-check.ts` on every main and staging run. Not part of a Nest HTTP module; not on the financial path.
- `messaging` — one spec: queue, consumer, inbox, outbox, projections, and the event envelope
- `observability` — `SimpleLogger` (`loggers/`), the application clock adapter (`clocks/`), and metrics (`metrics/`), with the Nest adapter in `services/`. The logger and metric contracts are owned by application `observability`; the clock contract is owned by application `time`.
- `environment` — the only reader of `process.env`. One getter per variable, no business rule.

A module lives inside the folder it wires: `persistence.module.ts`, `messaging.module.ts`, `observability.module.ts`, `environment.module.ts`. It builds the adapters and binds tokens from the owning context's `tokens/` folder with `useExisting`; infrastructure-owned tokens live in the infrastructure module's own `tokens/` folder. A factory is a class that implements `FactoryProtocol` from `infrastructure/protocols`, receives `Environment` in the constructor, and builds its value in `create()`. It never reads a variable.

An adapter is `@Injectable()` and receives its collaborators in the constructor: `MikroORM` and `SQSClient` by their class token, a port by its token, and a primitive from `QUEUE_CONFIG`. A factory provider stays for the client and the value built from `Environment`. A pure collaborator that the adapter calls, such as a mediator or a mapper, is provided by the module that consumes it, so the module arrow does not become a cycle.
