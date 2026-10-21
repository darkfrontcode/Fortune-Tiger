# Domain

Center of Clean Architecture. Business rules. No Nest, no MikroORM, and no SQS.

An entity has an `id`. A value object has no `id` and is compared by value. Do not label each concept ahead of time.

The folder is the concept. The file is the concept: `ledger/ledger.ts`. `entities/` and `values/` appear inside a concept only when that concept needs both.

The constructor stays closed and receives the `schema`. No `_balance` field. A getter reads the schema. A rule method writes the schema. `Money` and the ledger return another instance. Static factories: `create`, `from`, `rehydrate`, `open`. `rehydrate` only rebuilds. It does not revalidate a transition. Type names, kind, status, and `failureCode` follow the statement. The word `props` is not a type name and not a parameter name.

Each folder here has an English `spec.md`. The code in that folder follows that spec. No spec, no code. The behavior stays in the concept file. The types of that concept stay in `types.ts`, in one `export namespace` named `{Concept}Type`. `MoneyType` holds `Schema`, then `Input`, then `Output`. The file that uses them aliases each name at the top. No extra folder for an enum or a detail that fits in the parent spec.

This layer is `money`, `wallet`, `ledger`, and `wager`. There is no `shared` folder and no `protocols` folder here. A plug-in contract lives in `application/protocols` or `infrastructure/protocols`.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `money`
- `wallet`
- `ledger`
- `wager`
