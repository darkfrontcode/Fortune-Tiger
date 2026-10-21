# Architecture

Pragmatic Clean Architecture. One folder per layer. Dependencies point inward. This file is the map. What each folder is allowed to do is in that folder's `AGENTS.md`. The rules for a concept are in that concept's `spec.md`.

## Language

Every text written in this project is English. That includes this file, the README, the specs, and the docs. The statement copy in `docs/challenge-original.md` stays as published.

## Specification-Driven Development

The spec sits next to the code it describes. A `spec.md` is written in English before the code in that folder. A behavior that is not in that `spec.md` is not implemented. A missing decision is added to the spec before any code.

## Simplicity

Clean Architecture is here so an evaluator, or the evaluator's assistant, can open the repository and see what each folder is. Simple names. Few files. Small files.

A folder name is one word, plural, with no hyphen: `transactions`, `reconciliations`, `idempotencies`. Open the folder and the file inside is the singular subject: `wager.service.ts`, `reconciliation.service.ts`, `idempotency.service.ts`. A Nest role stays as a suffix (`health.controller.ts`). A hyphen does not sit in the middle of the concept. Domain folders stay the business word: `money`, `wallet`, `ledger`, `wager`.

Clean code: one responsibility per class. A name is one English word and says what is being checked. A message constant is the exception: `UPPER_SNAKE_CASE` ending with `_MESSAGE`. A class name may join the concept and the role, as in `MoneyGuard` and `MoneyAmountPattern`. No `BaseManager`, `CommonService`, or `GenericHelper`.

A design pattern is used only when it solves a problem in this challenge. The statement already asks for factories (`create`, `from`, `rehydrate`, `open`). No protocol per class. A section that fits in the parent spec does not become a new folder. Two exceptions live inside the concept: `data` for error text, and `patterns` when two rules share one protocol.

`src` has four folders: `domain`, `application`, `infrastructure`, and `presentation`. `src/main.ts` and `src/app.module.ts` are files beside them. There is no `src/modules` folder.

There is no folder named `shared`, `common`, or `utils`, at `src` or inside a layer. That name is a junk drawer. A plug-in contract lives in `protocols`, inside `application` or `infrastructure`. Domain does not have that folder. Presentation does not have that folder.

## Protocols

A plug-in contract is a protocol. The type name ends with `Protocol`, as in Swift. The file role is `protocol`: `mapper.protocol.ts`. The TypeScript interface inside takes an input and returns an output.

```ts
interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
```

`Mapper` is the naming example. It is not a type in this project. A protocol exists only when something is plugged in. The file lives in `application/protocols`. A concept folder does not hold a protocol. The clock is `ClockProtocol`. Provider identity is `ProviderIdentityProtocol`. The logger implements `LoggerProtocol`. `TheoryProtocol` and `PatternProtocol` live there. `index.ts` reexports that folder. Callers import the folder.

The domain is only `money`, `wallet`, `ledger`, and `wager`. Inbox, outbox, and the event envelope are sections of `messaging/spec.md`.

## Domain-driven design

An entity has an `id`. A value object has no `id` and is compared by value.

The domain folder is the concept, and the file is the concept: `ledger/ledger.ts`. Do not label each concept as an entity or a value object ahead of time. `entities/` and `values/` appear inside a concept only when that concept needs both. A name is one English word and says what is being checked. A message constant and a class name that joins the concept with its role are the exceptions.

Types of one concept live in `types.ts` beside that concept, in one `export namespace` named `{Concept}Type`. `Schema` is the state. `Input` and `Output` are the other shapes. The word `props` is not a type name and not a parameter name. The file that uses the namespace aliases each name at the top.

Error text of a concept lives in `data/messages.data.ts` inside that concept. One constant per phrase. The name is `UPPER_SNAKE_CASE` and ends with `_MESSAGE`, as in `CURRENCY_CONFLICT_MESSAGE`. `data/index.ts` reexports the file with `export *`. Callers import the folder. The domain imports only `application/protocols`, not use cases. An enum lives in `enums/`, one file per enum: `failure-code.enum.ts`. `enums/index.ts` reexports it. A map lives in `maps/`: `transition.map.ts` extends `Map`.

Two rules that share one contract live in `patterns` inside the concept. Each rule is a class in `{subject}.pattern.ts`, as in `amount.pattern.ts`. The class name ends with `Pattern`, as in `MoneyAmountPattern`. The expression is a `private readonly` property on that class. It is not a method and not a `const` above the class. `patterns/index.ts` reexports the classes with `export *`. The contract is `PatternProtocol`, in `application/protocols`, file `pattern.protocol.ts`. It has an input and an output. A concept folder does not hold a protocol.

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
  domain/
    AGENTS.md
    money/spec.md
    wallet/spec.md
    ledger/spec.md
    wager/spec.md
  application/
    AGENTS.md
    protocols/spec.md
    transactions/spec.md
    reconciliations/spec.md
    idempotencies/spec.md
  infrastructure/
    AGENTS.md
    persistence/spec.md
    messaging/spec.md
    observability/spec.md
  presentation/
    AGENTS.md
    http/spec.md
    health/spec.md
```

`main.ts` is the Nest entry, at `src/main.ts`. There is no `src/main/` folder. `app.module.ts` wires the layers. There is no `src/modules` folder. There is no `shared` folder.

Files follow the Nest name (`health.controller.ts`, `messages.data.ts`, `failure-code.enum.ts`). Classes stay PascalCase (`HealthController`). A folder that exposes its files reexports them from `index.ts` with `export *`. Callers import the folder. `src/domain/index.ts` reexports the four concepts. Inside a concept, `data/` holds `messages.data.ts`, `enums/` holds one `{subject}.enum.ts` per enum, `maps/` holds a class that extends `Map`, and `patterns/` holds the rule classes. A protocol stays in `application/protocols`. Unit tests live in `__tests__/` next to the module they cover. The file is `{subject}.spec.ts`. Production barrels do not reexport tests.

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
