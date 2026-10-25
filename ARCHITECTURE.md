# Architecture

Pragmatic Clean Architecture. One folder per layer. Dependencies point inward. This file is the map. What each folder is allowed to do is in that folder's `AGENTS.md`. The rules for a concept are in that concept's `spec.md`.

## Language

Every text written in this project is English. That includes this file, the README, the specs, and the docs. The statement copy in `docs/challenge-original.md` stays as published.

## Specification-Driven Development

The spec sits next to the code it describes. A `spec.md` is written in English before the code in that folder. A behavior that is not in that `spec.md` is not implemented. A missing decision is added to the spec before any code.

## Simplicity

Clean Architecture is here so an evaluator, or the evaluator's assistant, can open the repository and see what each folder is. Simple names. Few files. Small files.

A folder name is one word, plural, with no hyphen: `wagers`, `wallets`, `references`, `reconciliations`, `idempotencies`. Application use cases live in `use-cases/` with one `{action}.use-case.ts` per operation; reusable responsibilities such as idempotency remain services. A Nest role stays as a suffix (`health.controller.ts`). A hyphen does not sit in the middle of the concept. Domain folders stay the business word: `money`, `wallet`, `ledger`, `wager`.

Clean code: one responsibility per class. A name is one English word and says what is being checked. A message constant is the exception: `UPPER_SNAKE_CASE` ending with `_MESSAGE`. A string with meaning is a `const` at the top of the file, never loose; the same literal on two lines is one constant. A class name may join the concept, the subject, and the role, as in `MoneyAmountGuard` and `MoneyAmountPattern`. No `BaseManager`, `CommonService`, or `GenericHelper`.

A design pattern is used only when it solves a problem in this challenge. The statement already asks for factories (`create`, `from`, `rehydrate`, `open`). No protocol per class. A section that fits in the parent spec does not become a new folder. Three exceptions live inside the concept: `data` for error text, `patterns` when two rules share one contract, and `guards` when a rule is a class of its own.

`src` has four folders: `domain`, `application`, `infrastructure`, and `presentation`. `src/main.ts` and `src/app.module.ts` are files beside them. There is no `src/modules` folder.

Cross-layer imports use the TypeScript path aliases `@application/*`, `@domain/*`, `@infrastructure/*`, and `@presentation/*`, with subpaths such as `@domain/money`. These aliases are configured in `tsconfig.json` and resolved by Bun.

There is no folder named `shared`, `common`, or `utils`, at `src` or inside a layer. That name is a junk drawer. Application ports live beside the capability that consumes them. Cross-cutting application ports have explicit `observability` and `time` owners. Infrastructure-internal and presentation-specific contracts live beside their consumers. The domain does not import application.

## Protocols

A plug-in contract is a protocol. The type name ends with `Protocol`, as in Swift. The file role is `protocol`: `mapper.protocol.ts`. The TypeScript interface inside takes an input and returns an output.

```ts
interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
```

`MapperProtocol` defines the mapping contract for adapters in presentation and messaging (`mappers/mapper.protocol.ts`). Application ports live in the `protocols/` folder of the capability that consumes them, with a local `index.ts` and `spec.md`. The clock belongs to application `time`; logger and metric belong to application `observability`; readiness belongs to application `health`. Provider identity belongs beside the presentation HTTP provider, and publisher belongs beside its infrastructure messaging consumer. Domain guards and patterns are concrete rules, not application protocols.

The domain is only `money`, `wallet`, `ledger`, and `wager`. Inbox, outbox, and the event envelope are sections of `messaging/spec.md`.

## Domain-driven design

An entity has an `id`. A value object has no `id` and is compared by value.

The domain folder is the concept, and the file is the concept: `ledger/ledger.ts`. Do not label each concept as an entity or a value object ahead of time. `entities/` and `values/` appear inside a concept only when that concept needs both. A name is one English word and says what is being checked. A message constant and a class name that joins the concept with its role are the exceptions.

Types of one concept live in `types.ts` beside that concept, in one `export namespace` named `{Concept}Type`. `Schema` is the state. `Input` and `Output` are the other shapes. The word `props` is not a type name and not a parameter name. The file that uses the namespace aliases each name at the top.

Error text of a concept lives in `data/messages.data.ts` inside that concept. One constant per phrase. The name is `UPPER_SNAKE_CASE` and ends with `_MESSAGE`, as in `CURRENCY_CONFLICT_MESSAGE`. `data/index.ts` reexports the file with `export *`. Callers import the folder. The domain has no application imports. An enum lives in `enums/`, one file per enum: `failure-code.enum.ts`. `enums/index.ts` reexports it. A map lives in `maps/`: `transition.map.ts` extends `Map`.

Two rules that share one concept live in `patterns` inside the concept. Each rule is a class in `{subject}.pattern.ts`, as in `amount.pattern.ts`. The class name ends with `Pattern`, as in `MoneyAmountPattern`. The expression is a `private readonly` property on that class. It is not a method and not a `const` above the class. `patterns/index.ts` reexports the classes with `export *`. Patterns are concrete domain rules and do not implement an application protocol.

A rule that refuses or answers lives in `guards` inside the concept or the use case that owns it. One rule per class, in `{subject}.guard.ts`, as in `money-amount.guard.ts`. The class name joins the concept, the subject, and the role, as in `MoneyAmountGuard`. Its method is `guard`: a guard that refuses returns nothing and throws, and a guard that only answers returns a `boolean`. The owner holds one instance, as a `const` at the top of the concept file or as a `private readonly` property. A guard does not build the entity, and the owner asks it instead of restating the rule. A guard may hold other guards inside when the rule is composed, as `LedgerBalanceGuard` does: it asks the inner guard instead of repeating the inner rule. Each guard stays individual: one rule per class, and no inner rule restated. The input of a composite guard is a type in `types.ts` of that concept. A guard holds no optional field. `guards/index.ts` reexports the classes with `export *`, the concept keeps its own `guards/spec.md`, and each guard has a spec in `guards/tests/{subject}.guard.test.ts`. A concept barrel does not reexport `guards`: the concept uses the guard, and the caller uses the entity.

## Score

The delivery target is the full score in section 14 of the statement: 100 points. A load test is optional and is not part of that score.

## Entity state

The statement skeleton stores state in underscored fields (`_balance`, `_status`). Section 6 allows a different signature when the guarantee stays. The underscore is not required. Encapsulated state and an explicit transition are required.

Follow the HR Tech domain shape:

- A private constructor receives a `schema`. It does not receive a loose underscored field.
- A getter reads the schema.
- A method that carries the rule writes the schema. There is no generic setter and no `_field`.
- `Money` and the ledger stay immutable. An operation returns a new instance.
- `create`, `from`, `rehydrate`, and `open` stay. `rehydrate` only rebuilds the persisted schema.

Type names, kinds, statuses, and `failureCode` follow the statement. The field shape follows HR Tech.

## Tree

```text
src/
  main.ts
  app.module.ts
  runtime.service.ts
  domain/
    AGENTS.md
    index.ts
    ledger/
      data/
      enums/
      guards/tests/
      tests/
    money/
      data/
      guards/tests/
      patterns/
      tests/
    wager/
      data/
      enums/
      guards/tests/
      maps/
      tests/
    wallet/
      data/
      guards/tests/
      tests/
  application/
    AGENTS.md
    audits/
      enums/
      protocols/
      tokens/
      use-cases/tests/
    health/
      enums/
      protocols/
      tokens/
      use-cases/tests/
    idempotencies/
      enums/
      guards/tests/
      patterns/tests/
      tests/
    journeys/
      data/
      enums/
      protocols/
      services/tests/
      tokens/
      use-cases/tests/
    observability/
      data/
      maps/
      protocols/
      tokens/
    references/
      protocols/
      tokens/
      use-cases/tests/
    reconciliations/
      data/
      patterns/
      protocols/
      tokens/
      use-cases/tests/
    time/
      tokens/
    wallets/
      protocols/
      tokens/
      use-cases/tests/
    wagers/
      data/
      mediators/tests/
      protocols/
      strategies/
      tokens/
      use-cases/tests/
  infrastructure/
    AGENTS.md
    protocols/
    audit/
      tests/
    journey/
      tests/
    mongo/
    environment/tests/
    messaging/
      consumers/enums/
      consumers/tests/
      events/wager/
      events/wallet/
      factories/
      mappers/tests/
      messages/data/
      messages/tests/
      publishers/tests/
      tokens/
    observability/tests/
    persistence/
      data/
      inbox/
      ledger/
      migrations/
      outbox/queries/
      reconciliation/
      tests/
      wager/
      wallet/
  presentation/
    AGENTS.md
    http/
      controllers/
      data/
      dtos/
      errors/
      factories/
      filters/
      guards/
      interceptors/
      mappers/
      maps/
      providers/
      queries/
      statuses/
      tests/
      tokens/
    health/
      controllers/
      tests/
```

`main.ts` is the Nest entry, at `src/main.ts`. There is no `src/main/` folder. `app.module.ts` imports the layer modules, and `runtime.service.ts` starts the outbox worker, the reference worker, the request consumer, and the audit consumer on boot and closes them on shutdown. There is no `src/modules` folder. There is no `shared` folder.

Beside `src`, the repository keeps `docs/` for the statement, the plan, the API and its checked-in OpenAPI document, the ADRs, the delivery path, testing, and the load note; `scripts/` for `verify`, `verify:full`, `demo`, `load`, `auth`, `openapi`, and `cluster`; `docker/` for the queue bootstrap, the optional Keycloak realm, and the Prometheus and Grafana provisioning; `kubernetes/` for the cluster, the Kustomize tree, and the overlay that adds the observability pair; and `test/` for the end-to-end setup file and the audit channel used by the timeline suite. `EVIDENCE.md` records the last local run, and `EVALUATION.md` is the section 14 checklist against the code.

Files follow the Nest name (`health.controller.ts`, `health.module.ts`, `messages.data.ts`, `failure-code.enum.ts`). Classes stay PascalCase (`HealthController`). A folder that exposes its files reexports them from `index.ts` with `export *`. Callers import the folder. `src/domain/index.ts` reexports the four concepts. Inside a concept, `data/` holds `messages.data.ts`, `enums/` holds one `{subject}.enum.ts` per enum, `maps/` holds a class that extends `Map`, `patterns/` holds concrete rule classes, and `guards/` holds one class per rule with its own `spec.md`. Application ports live in the consuming capability's `protocols/` folder; adapter-internal contracts and presentation-specific extension contracts stay with their consumer. A port token lives in a `tokens/` folder under the owning module, with one `Symbol` per file and an `index.ts` barrel. Unit tests live in `tests/` next to the module they cover. The file is `{subject}.test.ts`. Production barrels do not reexport tests.

## Composition

A Nest module sits inside the boundary it wires, and it is the only file that knows both sides of a port. `observability.module.ts`, `persistence.module.ts`, `messaging.module.ts`, `audit.store.module.ts`, `journey.store.module.ts`, and `health.module.ts` build the adapters and the controller. `http.module.ts` provides wallet use cases alongside the HTTP controller and persistence ports. `wagers.module.ts`, `reconciliations.module.ts`, `references.module.ts`, `audits.module.ts`, and `journeys.module.ts` build their use cases.

A port is a protocol plus a token. The protocol is the contract and carries no runtime value. The token is one `Symbol` in `tokens/` under its owning module, one file each, named after the protocol without the suffix. Cross-cutting application tokens live with their `observability` or `time` contracts. The owning module binds the token with `useExisting`, so one instance answers to both names, and the consumer injects only the token.

`src/app.module.ts` imports the modules and wires only what spans layers: `ReferenceWorker` and `RuntimeService`. It holds no adapter and no use case. A module imports the module whose provider it needs, and that import is the composition edge: the arrow points outward there, and nowhere else. Inside application, consumers import their owned protocols, never adapters.

## Injection

Nest builds the graph. `application` and `infrastructure` declare `@Injectable()` on the class and receive a collaborator through the constructor. The domain does not: a concept holds its guard and its pattern as a `const` at the top of its own file.

A port arrives by its token, as `@Inject(WAGER_GATEWAY)`. A collaborator with one implementation arrives by its class, as `IdempotencyService`, `WagerMediator`, or `WagerEventsMapper`. A protocol exists only when something is plugged in, so a class with one implementation carries no token.

`new` inside a class is allowed in four places, and nowhere else:

- a factory that builds its own type: `Money.from`, `WagerRequest.from`, `SimpleLogger.open`, the event `enqueue` and `from`;
- a pure helper with no I/O and no configuration, held by its owner: `WalletMapper` inside its repository, `PayloadHashPattern` inside `IdempotencyService`;
- a repository tied to the transaction `EntityManager`: `new WalletRepository(manager)` is the Unit of Work;
- a third-party client at the edge: `createOrm` and `createSqsClient` in a factory.

A use case or service with a collaborator is not built with `new`. `SubmitWagerUseCase`, `IdempotencyService`, the mediators, the writers, the readers, the workers, the publisher, the consumer, and the readiness probes arrive through the constructor.

A factory provider stays for a value the container builds from `Environment` (`MikroORM`, `SQSClient`, `QUEUE_CONFIG`) and for the array the health module joins (`READINESS`). A pure collaborator used by two layers is provided by the module that consumes it, so the layer arrow does not become a module cycle.

`Environment` is the only reader of `process.env`. `environment.module.ts` provides it and exports it, so every factory receives it instead of reading a variable. `main.ts` asks the container for the port.

## Auth

Decision: one guard, two modes, selected by `AUTH_MODE`. The default `anonymous` mode keeps a local run and the CI free of an identity provider: `AnonymousProviderIdentity` trusts `X-Provider-Id` and falls back to the `providerId` of the body. The `jwt` mode verifies `Authorization: Bearer` against a Keycloak realm key set, checks the issuer and the audience, and reads `provider_id` as the caller. A refused credential answers `401`; an unreachable key set stays a `503`, so a provider knows whether to fix the token or to retry.

`http.module.ts` binds `PROVIDER_IDENTITY` with `useFactory` over `ProviderIdentityFactory`, which receives `Environment` and refuses to boot the `jwt` mode without `OIDC_JWKS_URL`. `ProviderIdentityProtocol` lives beside the HTTP provider so a real IdP replaces one class. The trade-off is deliberate: Keycloak ships as a compose profile (`--profile auth`) and is never required by the test pipeline, and the guard stays a presentation concern, so the domain and the queue keep receiving a resolved provider identity.

Keycloak itself is optional infrastructure. A production deployment would add the realm to the platform, replace the demo provider user with the provider's own client, and keep the same guard.

## Messaging

Delivery is at-least-once. FIFO is an optimization, not the guarantee: `MessageGroupId` is the aggregate id, so one wallet keeps its order and two wallets may interleave. Uniqueness lives in Postgres — the inbox row, the unique idempotency key, and the unique `(provider_id, external_transaction_id)`.

The channel has two directions. `wager-transactions.fifo` carries requests into the consumer, with `wager-transactions-dlq.fifo` behind it; `wager-events.fifo` carries integration events out of the publisher, with `wager-events-dlq.fifo` behind it. A poison request never sits in front of an event, and the two sides scale on their own.

A second consumer reads `wager-events.fifo` and appends the audit timeline to MongoDB. It maps the same envelope the publisher wrote, stores one document per `eventId`, and acknowledges a duplicate as a successful duplicate. A storage failure retries with the same ladder and moves to `wager-events-dlq.fifo` on the fifth receive; an invalid event goes there immediately. The audit store is a read model: the financial commit never waits for it.

The inbox, the wager, the wallet, the ledger, and the outbox commit in one SQL transaction. The ack happens after that commit, and the publisher sends outside it, so an event never leaves before the financial change is durable. A publisher that dies after the send republishes, and the consumer inbox keeps the effect single.

The retry ladder is data, not a loop: `attempts` and `nextAttemptAt` decide the next attempt on both the outbox row and the pending reference, with `1s × 2^(attempts - 1)` capped at 60 seconds. The consumer moves a message to the dead-letter queue after five receives, and a permanent failure goes there immediately. The outbox has no dead-letter: it keeps retrying, and the lag metric makes a backlog visible before it becomes a delay.

## Journey

The journey is the per-caller view of a request, stage by stage. Where the audit answers "which events did this wager produce", the journey answers "what did this request do, stage by stage". It is a read model in MongoDB, next to the audit timeline, and it never joins the financial SQL transaction.

The stages are recorded by the code that owns the step: `ROUTE` by `JourneyInterceptor` in the presentation, `USE_CASE` by the use cases, `DATABASE` by the persistence writers, and `QUEUE` by the outbox publisher. Each settled stage reports `SUCCEEDED`, `FAILED`, or `ROLLBACK` and the time it spent. `flowId` groups one aggregate — a wager uses its `idempotencyKey` — and `providerId` + `playerId` join the steps of one caller across requests. One document per `stepId`, unique, with indexes for the aggregate order, the caller across requests, and a provider over time.

`JourneyService.record` is fire-and-forget: it never throws and never awaits a caller. A store failure increments `journey_events_failures_total`, logs a warning, and leaves the financial answer unchanged; a MongoDB outage loses the observation of that step, never a balance. The providers are provider-scoped through the existing guard: `GET /wagering/transactions/:transactionId/journey` answers a foreign wager like the wager route, and `GET /providers/:providerId/players/:playerId/journey` answers `404` when a provider reads someone else's picture of a player. MongoDB is not part of `/health/ready`.

`JourneyStoreProtocol` and `JOURNEY_STORE` are owned by `application/journeys`; the Mongoose adapter lives only in `infrastructure/journey`, and the connection is `MongoConnection` in `infrastructure/mongo`, shared with the audit store.

## Observability

`LoggerProtocol` writes one line per event, JSON by default and text under `LOG_PRETTY`, with `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId` attached through `child`. An amount and a wager body never enter a log line.

`MetricProtocol` carries counters and observations. `PrometheusMetric` is the default adapter and answers `GET /metrics` with the Prometheus text exposition; `SimpleMetric` serves `METRICS_BACKEND=memory` and the unit tests. The names live in `application/observability/data` and the help text lives in its `maps`, so no adapter invents a name. The instrumented families are transactions by status, duplicates, retries, dead letters, lock conflicts, outbox lag, processing latency, the audit persisted, duplicate, and failure counters, and the journey recorded and failure counters.

`GET /health/live` reads the process, and `GET /health/ready` asks PostgreSQL and SQS at the same time with a two-second abort, so a dead dependency answers `503` instead of hanging the check. MongoDB stays out of readiness: the audit timeline and the journey are not on the financial path.

## Kubernetes

The delivery also runs on a real cluster: `kind` starts one control plane and two workers as Docker containers, and `scripts/cluster.ts` is the only entry. `bun run cluster:up` resolves `kind` and `kubectl` (downloading the pinned releases into `.tools/bin` when they are missing), starts Docker when it is not answering, builds and loads the image, applies the Kustomize tree, runs the migration Job, and waits for both replicas before it checks `/health/ready`.

`kubernetes/base` holds the namespace, the ConfigMaps, the secret, the two PostgreSQL statefulsets with their headless services, LocalStack, Mongo, the migration Job, the API Deployment, its services, and its PodDisruptionBudget. `kubernetes/overlays/local` is the delivery and turns the `api` Service into a `NodePort` on `30080`; `kubernetes/overlays/observability` adds Prometheus and Grafana. The cluster definition lives in `kubernetes/kind`, and every folder explains its own rule in its `spec.md`.

Six pods run at rest. Two `api` replicas sit behind the Service, which is the load balancer: kube-proxy spreads connections across both endpoints, and the balance is per connection, not per request. PostgreSQL runs a primary and a streaming standby on different workers, and the API writes only to the primary. LocalStack is the one workload with a single replica on purpose: it is the broker, and two replicas would hold two separate queue sets. `mongo` is the read model, a single replica: the audit timeline and the journey are observations, not financial state, and the API keeps working while the store is down.

`bun run cluster:verify` reads the shape instead of assuming it: nodes, endpoints, replication, the migration, the financial flow with a replay, the MongoDB collections of the datalake, and a per-pod counter after a burst of requests. The `CI` workflow runs `cluster:up` and then `cluster:verify`, so the manifests are proven on a real cluster on every push to `main` and every pull request.

## Limits

Stated here so the delivery is read for what it is:

- Delivery is at-least-once. A crash after the commit and before the ack redelivers the message, and the inbox keeps the effect single. Exactly-once end to end is not claimed.
- Ledger immutability is the application's discipline. The unique `transaction_id` stops a duplicate row, not an `UPDATE`, because the database grant is out of this delivery.
- Reconciliation compares the stored balance with the ledger and reports the difference. It never repairs, so a divergence needs an operator.
- A wallet holds one currency, and a reversal is all-or-nothing: partial reversal is out.
- The `anonymous` auth mode trusts the caller, because a local run and the CI should not need an identity provider. `AUTH_MODE=jwt` is the mode that verifies a token.
- The audit timeline and the journey are eventually consistent. They are read models in MongoDB — the audit fed by the outbox, the journey recorded stage by stage — not transactional records; a MongoDB outage delays them and never rolls back a wager. OpenTelemetry and a dashboard stay out. The Prometheus exposition is in.
- The load script measures the running API on one machine. It is not a CI gate, it has no RPS target, and its numbers are not a capacity claim.
- The cluster runs on one machine. Three nodes share a kernel and a disk, the standby has no automatic failover, and no autoscaler is provisioned.
- The queue runs as one LocalStack pod. A managed SQS brings its own redundancy; two LocalStack replicas would hold two separate queue sets, so the broker stays single and readiness reports it when it is gone.

## Decisions

Twelve records in [`docs/adr/`](docs/adr/) hold the reasoning behind the shape: the four layers and their ports, PostgreSQL with the pessimistic lock, the rich domain, at-least-once delivery with the inbox and the outbox, idempotency as a stored fact, the two auth modes, the observability choice, the split between inbound and outbound queues, the local cluster, the polyglot audit store, and the journey read model in MongoDB. A decision that changes gets a new record; the old one keeps its number.

## Stack

| Item | Choice |
| --- | --- |
| Runtime, package manager, test runner | Bun 1.x |
| Language | TypeScript strict |
| Framework | NestJS |
| Database | PostgreSQL 16 |
| Read models | MongoDB 7 with Mongoose — the audit timeline and the journey |
| Queue | LocalStack. The statement also allows MiniStack. |
| ORM | MikroORM |
| Local cluster | kind 0.33 with Kustomize, on Kubernetes 1.32 |

Section 4 of the statement prefers MikroORM and also accepts TypeORM. It excludes Prisma. The database stays PostgreSQL. MongoDB holds only the append-only audit timeline and the per-caller journey; it is not a second source of financial truth.

`README.md` stays at the repository root. It is short: the four folders and the stack. It is updated whenever a phase lands. Setup, commands, and `LOG_PRETTY` join it when the app exists. It does not list every spec.

## History

Conventional Commits. A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits. The subject names the functionality. Example: `feat/docs/readme`. The commit uses that same type. The branch, the commit, and the pull request stay linked.

One commit per pull request. `main` changes only through a pull request. No direct push.

Work does not start on `main`. When a diff is growing past one commit, stop and split it before continuing.
