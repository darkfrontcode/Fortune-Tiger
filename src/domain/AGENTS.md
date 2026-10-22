# Domain

Center of Clean Architecture. Business rules. No Nest, no MikroORM, and no SQS.

An entity has an `id`. A value object has no `id` and is compared by value. Do not label each concept ahead of time.

The folder is the concept. The file is the concept: `ledger/ledger.ts`. `entities/` and `values/` appear inside a concept only when that concept needs both.

The constructor stays closed and receives the `schema`. No `_balance` field. A getter reads the schema. A rule method writes the schema. `Money` and the ledger return another instance. Static factories: `create`, `from`, `rehydrate`, `open`. `rehydrate` only rebuilds. It does not revalidate a transition. Type names, kind, status, and `failureCode` follow the statement. The word `props` is not a type name and not a parameter name.

Each folder here has an English `spec.md`. The code in that folder follows that spec. Unit tests live in `tests/` inside that concept or subfolder, as `{subject}.test.ts`. No spec, no code. The behavior stays in the concept folder. The concept file is the business word: `ledger.ts`. Guards live in `guards/`, one class per rule, with `index.ts` and `spec.md`. A guard only checks. Every class there implements `GuardProtocol` from `application/protocols`, and the method is `guard`: a guard that refuses returns nothing and throws, and a guard that only answers returns a `boolean`. The class name joins the concept, the subject, and the role, as in `MoneyAmountGuard`. The file is `kebab-case` ending with `.guard.ts`, as in `money-amount.guard.ts`. The owner holds one instance, as a `const` at the top of the concept file or as a `private readonly` property. A guard does not build the entity, and the owner asks it instead of restating the rule. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule. Each guard stays individual. The input of a composite guard is a type in `types.ts` of that concept, as in `MoneyType.Conflict`. A guard holds no optional field. Each guard has a spec in `guards/tests/{subject}.guard.test.ts`, and `guards/spec.md` says what each one checks. Error text is one constant per phrase, in `data/messages.data.ts`. The name is `UPPER_SNAKE_CASE` and ends with `_MESSAGE`, as in `CURRENCY_CONFLICT_MESSAGE`. `data/index.ts` reexports that file with `export *`. Callers import the folder. The domain does not import `application`, except `application/protocols`. The types of that concept stay in `types.ts`, in one `export namespace` named `{Concept}Type`. `MoneyType` holds `Schema`, then `Input`, then `Output`. The file that uses them aliases each name at the top. An enum lives in `enums/`, one enum per file, `kebab-case` with the suffix `.enum.ts`, as in `failure-code.enum.ts` and `ledger-direction.enum.ts`. `enums/index.ts` reexports them with `export *`. A map lives in `maps/`, a class that extends `Map`, named `{subject}.map.ts`, as in `transition.map.ts`. `patterns` holds one class file per rule, `{subject}.pattern.ts`, and `index.ts`. The class name ends with `Pattern`. The expression is a `private readonly` property on that class. It is not a method and not a `const` above the class. The protocol they implement lives in `application/protocols`. The concept folder does not hold it. The domain imports only that folder from `application`, not use cases. `src/domain/index.ts` reexports `money`, `wallet`, `ledger`, and `wager` with `export *`. A concept barrel does not reexport `guards/`: the concept uses the guard, and the caller uses the entity.

This layer is `money`, `wallet`, `ledger`, and `wager`. There is no `shared` folder and no `protocols` folder here. A plug-in contract lives in `application/protocols`.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `money`
- `wallet`
- `ledger`
- `wager`
