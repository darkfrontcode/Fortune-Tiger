# AGENTS

Jungle Gaming backend challenge. The statement is in `docs/challenge-original.md`. The folder map is in `ARCHITECTURE.md`. This file replaces neither.

## Language

Every text written in this project is English. That includes the README, the specs, the docs, and this file. The statement copy in `docs/challenge-original.md` stays as published.

## Specification-Driven Development

The spec sits in the code folder, in `spec.md`, in English. Do not implement a folder without that file. Behavior missing from that `spec.md` does not enter the code. A missing decision is written in the spec before the code.

Phase order is `docs/plan.md`.

Each layer explains itself in its own `AGENTS.md`:

- `src/domain/AGENTS.md`
- `src/application/AGENTS.md`
- `src/infrastructure/AGENTS.md`
- `src/presentation/AGENTS.md`

## File

Nest names, Angular style. The file is `kebab-case` with the role as a suffix. The class stays PascalCase.

| Right | Wrong |
| --- | --- |
| `app.module.ts` | `AppModule.ts` |
| `health.controller.ts` | `HealthController.ts` |
| `logger.service.ts` | `LoggerService.ts` |
| `simple.logger.ts` | `SimpleLogger.ts` |

Nest boots at `src/main.ts`. The root module is `src/app.module.ts`. There is no `src/main` folder and no `src/modules` folder.

## Simplicity

Simple code. Clean Architecture lets an outsider see what each folder is. Simple names. Few files. Small files.

A use-case folder is plural, one word, no hyphen: `transactions`, `reconciliations`, `idempotencies`. Open the folder and the file is the singular subject: `wager.service.ts`, `reconciliation.service.ts`, `idempotency.service.ts`. The Nest role keeps its hyphen (`health.controller.ts`). A hyphen does not sit in the middle of the concept. Domain names stay the business word: `money`, `wallet`, `ledger`, `wager`.

Clean code: one responsibility per class. No `BaseManager`, `CommonService`, or `GenericHelper`.

A design pattern needs a real problem. The factories the statement asks for are `create`, `from`, `rehydrate`, and `open`. No protocol per class. A section that fits in the parent spec does not become a new folder.

## Protocol

A plug-in contract. The name ends with `Protocol`, as in Swift. The file carries the role: `mapper.protocol.ts`. Inside, the TypeScript interface has an input and an output.

```ts
interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
```

`Mapper` is the naming example. It is not a type in this project. A protocol exists only when something is plugged in. The clock is `ClockProtocol`. Provider identity is `ProviderIdentityProtocol`. The logger implements `LoggerProtocol`.

The delivery target is the full score of section 14. A load test is not part of that score.

## Entity state

The skeleton underscore (`_balance`) stays out of the code. Section 6 allows a different signature. State is a `schema`, received by the private constructor, as in the format skill. A getter reads the schema. A rule method writes the schema. `Money` and the ledger return another instance. Type names, kind, status, and `failureCode` follow the statement.

## Inside the file

TypeScript strict. The `formatos-de-codigo` skill applies inside the file: `const`, no comment, a named callback, no `for`.

The statement wins when the skeleton asks for `isZero`, `isProcessed`, or the factories `create`, `from`, and `rehydrate`.

## DDD

An entity has an `id`. A value object has no `id` and is compared by value.

The domain folder is the concept, and the file is the concept: `ledger/ledger.ts`. Do not label each concept ahead of time. `entities/` and `values/` appear inside a concept only when that concept needs both.

## Scope

Keycloak, OpenTelemetry, double-entry, partial reversal, and a load test stay out of this delivery.

The database is PostgreSQL. The ORM is MikroORM. Section 4 of the statement also accepts TypeORM.

## Git

Conventional Commits. A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits, such as `docs`, `domain`, or `application`. The subject names the functionality in a few words. Example: `feat/docs/readme`. The commit uses that same type. The branch, the commit, and the pull request stay linked.

One commit per pull request. `main` changes only through a pull request. No direct push.

Work does not start on `main`. This design, for example, lives on `feat/docs/structure`.

When a diff grows past one commit, say so and propose the split before continuing. Commit only when asked. The suggestion of the moment can come first.

## Delivery

The root `README.md` is short, in English, with badges and dropdowns. It shows the four folders and the stack. Update it on every phase that lands. Setup, commands, and `LOG_PRETTY` join it when the app exists. It does not list every spec, and it does not list what this project leaves out. Review SQL, the lock, and the financial rule before closing a phase.
