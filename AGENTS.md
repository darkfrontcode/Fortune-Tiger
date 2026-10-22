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

Nest names, Angular style. The file is `kebab-case` with the role as a suffix. The class stays PascalCase. The folder stays lowercase.

| Right | Wrong |
| --- | --- |
| `messages.data.ts` | `Messages.Data.ts` |
| `failure-code.enum.ts` | `FailureCode.Enum.ts` |
| `money-amount.guard.ts` | `MoneyAmount.Guard.ts` |
| `amount.pattern.ts` | `MoneyAmount.Pattern.ts` |
| `transition.map.ts` | `Transition.Map.ts` |
| `theory.protocol.ts` | `Theory.Protocol.ts` |
| `health.controller.ts` | `Health.Controller.ts` |
| `health.module.ts` | `Health.Module.ts` |
| `wager.service.ts` | `Wager.Service.ts` |
| `app.module.ts` | `App.Module.ts` |

The concept file stays the business word: `money.ts`, `wallet.ts`, `ledger.ts`, `wager.ts`. Types stay in `types.ts`. A unit test stays in `tests/`, named `{subject}.test.ts`, beside the code it covers.

Nest boots at `src/main.ts`. The root module is `src/app.module.ts`. Those two files sit beside the layers. They are not folders.

`src` has four folders, and only these: `domain`, `application`, `infrastructure`, `presentation`. There is no `src/modules` folder and no `src/main` folder.

There is no folder named `shared`, `common`, or `utils`, at `src` or inside a layer. That name is a junk drawer. A plug-in contract lives in `protocols`, inside `application`. Domain does not have that folder. Presentation does not have that folder. The domain imports only `application/protocols`, not use cases. `TheoryProtocol`, `PatternProtocol`, and `GuardProtocol` live there.

A folder that exposes its files reexports them from `index.ts` with `export *`. Callers import the folder, not the file. `src/domain/index.ts` reexports `money`, `wallet`, `ledger`, and `wager`. A folder with code and no barrel is incomplete.

## Composition

A Nest module sits inside the boundary it wires, as `health.module.ts` or `persistence.module.ts`. It is the only file that knows both sides of a port. `src/app.module.ts` imports the modules and wires only what spans layers: `ReferenceWorker` and `RuntimeService`.

A class that receives a collaborator is `@Injectable()` and receives it in the constructor. `application` and `infrastructure` use the Nest decorator; the domain does not. A port arrives by token, as `@Inject(WAGER_GATEWAY)`. A collaborator with one implementation arrives by class, as `IdempotencyService`. `new` inside a class stays for the factory that builds its own type, the pure helper with no I/O, the repository tied to the transaction `EntityManager`, and the third-party client built by a factory. `SubmitWagerUseCase`, the mediators, the writers, the workers, the publisher, the consumer, and the readiness probes arrive through the constructor.

A port is a protocol plus a token. The protocol lives in `application/protocols` and carries no runtime value. Each token is one `Symbol` in its own `tokens/` folder under the owning module. Cross-cutting tokens live in `application/dependencies/tokens`; context-specific tokens live with their application context, and infrastructure or presentation tokens live with their owning module. A `tokens/index.ts` barrel reexports the tokens. The module that owns the adapter binds the token with `useExisting`, so one instance answers to both names, and the consumer injects the token.

`Environment`, in `infrastructure/environment`, is the only reader of `process.env`.

## Simplicity

Simple code. Clean Architecture lets an outsider see what each folder is. Simple names. A name is one English word and says what is being checked. A message constant is the exception: `UPPER_SNAKE_CASE` ending with `_MESSAGE`. A class name may join the concept, the subject, and the role, as in `MoneyAmountGuard` and `MoneyAmountPattern`. Few files. Small files.

Application contexts are plural, one word, with no hyphen: `transactions`, `reconciliations`, `idempotencies`. Each route operation lives in its context's `use-cases/` folder, one `{action}.use-case.ts` per operation. A reusable application responsibility remains a service, as `idempotency.service.ts`. The Nest role keeps its suffix (`health.controller.ts`). Domain names stay the business word: `money`, `wallet`, `ledger`, `wager`.

Clean code: one responsibility per class. No `BaseManager`, `CommonService`, or `GenericHelper`.

A design pattern needs a real problem. The factories the statement asks for are `create`, `from`, `rehydrate`, and `open`. No protocol per class. A section that fits in the parent spec does not become a new folder. Three exceptions live inside the concept: `data` for error text, `patterns` when two rules share one contract, and `guards` when a rule is a class of its own. Error text is one constant per phrase in `data/messages.data.ts`, inside the concept that throws. The name is `UPPER_SNAKE_CASE` and ends with `_MESSAGE`, as in `CURRENCY_CONFLICT_MESSAGE`. `data/index.ts` reexports it with `export *`. Callers import the folder. The domain does not import `application` to read it. An enum lives in `enums/`, one enum per file: `failure-code.enum.ts`. A map lives in `maps/`, a class that extends `Map`: `transition.map.ts`.

A string literal with meaning does not sit loose in the code. It becomes a `const` at the top of the file, named with one English word: `encoding = 'base64url'`, `providerHeader = 'x-provider-id'`, `relation = 'wallet'`, `platform = 'fortune-tiger'`. The same literal on two lines is always one constant. A value the library already names keeps the library constant, as in `QueryOrder.ASC`. Three literals stay inline because the language reads them as shape, not as value: the right side of `typeof`, an object key, and the text a decorator receives.

A guard checks one rule and refuses it by throwing, or answers it with a `boolean`. One rule per class, in `guards/` inside the concept or the use case that owns it, with `index.ts`, `spec.md`, and `tests/`. The file is `{subject}.guard.ts`, as in `money-amount.guard.ts`. Every class implements `GuardProtocol`, and the method is `guard`. The owner holds one instance, as a `const` at the top of the concept file or as a `private readonly` property. A guard does not build the entity, and the owner asks it instead of restating the rule. A guard may hold other guards inside when the rule is composed, as `LedgerBalanceGuard` does: it asks the inner guard instead of repeating the inner rule. Each guard stays individual. A guard holds no optional field: the input of a composite guard is a type in `types.ts` of that concept, as in `MoneyType.Conflict`. Every guard has a spec in `guards/tests/{subject}.guard.test.ts`, and `guards/spec.md` says what each one checks. A concept barrel does not reexport `guards`: the concept uses the guard, and the caller uses the entity.

## Protocol

A plug-in contract. The name ends with `Protocol`, as in Swift. The file carries the role: `mapper.protocol.ts`. Inside, the TypeScript interface has an input and an output.

```ts
interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
```

`Mapper` is the naming example. It is not a type in this project. A protocol exists only when something is plugged in. The file lives in `application/protocols`. A concept folder does not hold a protocol. The classes that implement it may live in the concept, in `patterns`, in `guards`, or in the use-case folder. The pattern class name ends with `Pattern`, as in `MoneyAmountPattern`. The guard class name ends with `Guard`, as in `MoneyAmountGuard`. `patterns/index.ts` and `guards/index.ts` reexport the classes. The clock is `ClockProtocol`. Provider identity is `ProviderIdentityProtocol`. The logger implements `LoggerProtocol`. `TheoryProtocol`, `PatternProtocol`, and `GuardProtocol` live in `application/protocols`.

The delivery target is the full score of section 14. A load test is not part of that score.

## Entity state

The skeleton underscore (`_balance`) stays out of the code. Section 6 allows a different signature. State is a `schema`, received by the private constructor, as in the format skill. A getter reads the schema. A rule method writes the schema. `Money` and the ledger return another instance. Type names, kind, status, and `failureCode` follow the statement. The word `props` is not a type name and not a parameter name.

Types of one concept live in that concept's `types.ts`, in one `export namespace` named `{Concept}Type`. Inside it, `Schema` comes first, then `Input`, then `Output`. The file that uses them aliases each name at the top and does not repeat `{Concept}Type.Schema` in the body. `MoneyType` is the money namespace.

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
