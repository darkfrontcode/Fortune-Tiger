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
      patterns/tests/
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
      mappers/
      maps/
      providers/
      queries/
      statuses/
      tests/
    health/
      controllers/
```

`main.ts` is the Nest entry, at `src/main.ts`. There is no `src/main/` folder. `app.module.ts` imports the layer modules, and `runtime.service.ts` starts the outbox worker, the reference worker, and the queue consumer on boot and closes them on shutdown. There is no `src/modules` folder. There is no `shared` folder.

Files follow the Nest name (`health.controller.ts`, `health.module.ts`, `messages.data.ts`, `failure-code.enum.ts`). Classes stay PascalCase (`HealthController`). A folder that exposes its files reexports them from `index.ts` with `export *`. Callers import the folder. `src/domain/index.ts` reexports the four concepts. Inside a concept, `data/` holds `messages.data.ts`, `enums/` holds one `{subject}.enum.ts` per enum, `maps/` holds a class that extends `Map`, `patterns/` holds concrete rule classes, and `guards/` holds one class per rule with its own `spec.md`. Application ports live in the consuming capability's `protocols/` folder; adapter-internal contracts and presentation-specific extension contracts stay with their consumer. A port token lives in a `tokens/` folder under the owning module, with one `Symbol` per file and an `index.ts` barrel. Unit tests live in `tests/` next to the module they cover. The file is `{subject}.test.ts`. Production barrels do not reexport tests.

## Composition

A Nest module sits inside the boundary it wires, and it is the only file that knows both sides of a port. `observability.module.ts`, `persistence.module.ts`, `messaging.module.ts`, and `health.module.ts` build the adapters and the controller. `http.module.ts` provides wallet use cases alongside the HTTP controller and persistence ports. `wagers.module.ts`, `reconciliations.module.ts`, and `references.module.ts` build their use cases.

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

## Stack

| Item | Choice |
| --- | --- |
| Runtime, package manager, test runner | Bun 1.x |
| Language | TypeScript strict |
| Framework | NestJS |
| Database | PostgreSQL 16 |
| Queue | LocalStack. The statement also allows MiniStack. |
| ORM | MikroORM |

Section 4 of the statement prefers MikroORM and also accepts TypeORM. It excludes Prisma. The database stays PostgreSQL.

`README.md` stays at the repository root. It is short: the four folders and the stack. It is updated whenever a phase lands. Setup, commands, and `LOG_PRETTY` join it when the app exists. It does not list every spec.

## History

Conventional Commits. A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits. The subject names the functionality. Example: `feat/docs/readme`. The commit uses that same type. The branch, the commit, and the pull request stay linked.

One commit per pull request. `main` changes only through a pull request. No direct push.

Work does not start on `main`. When a diff is growing past one commit, stop and split it before continuing.
