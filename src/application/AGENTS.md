# Application

Use cases. It joins the domain and the SQL transaction boundary. No SQL and no HTTP.

A folder is plural, one word, no hyphen. The evaluator reads the folder name and knows what is inside.

There is no `shared` folder here. A plug-in contract lives in `protocols`. `TheoryProtocol`, `PatternProtocol`, `GuardProtocol`, and use-case protocols such as `WagerStrategyProtocol` live there. `protocols/spec.md` describes them. `protocols/index.ts` reexports with `export *`. A port token lives in `tokens/` under its owning context, one `Symbol` per file, with a local `index.ts` and `spec.md`. Cross-cutting application tokens live in `dependencies/tokens`. This layer does not import `presentation`. Domain error text does not live here. It stays in the concept, in `data/messages.data.ts`, one `UPPER_SNAKE_CASE` constant per phrase ending with `_MESSAGE`, reexported by `data/index.ts` with `export *`.

A use case that owns a rule with its own class puts it in `guards/`, inside the use-case folder, with `index.ts` and `spec.md`. The class implements `GuardProtocol` from `protocols`, and the method is `guard`: a guard that refuses returns nothing and throws, and a guard that only answers returns a `boolean`. The class name joins the subject and the role, as in `IdempotencyHashGuard`. The file is `kebab-case` ending with `.guard.ts`. The service that uses it holds one instance, as a `private readonly` property. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule, and each guard stays individual. Each guard has a spec in `guards/tests/{subject}.guard.test.ts`. A rule that only the domain owns stays in the concept, not here.

Each context has an English `spec.md`. Use cases live in a context-owned `use-cases/` folder, with one `{action}.use-case.ts` per application operation and tests in `use-cases/tests/`. Reusable application responsibilities stay services in `services/` or their existing context location. Specs describe the boundary and all application behavior.

`@Injectable()` is allowed here. A use case, a mediator, and the idempotency service receive their collaborators in the constructor. A port arrives by its token from the owning context's `tokens/` folder, as `@Inject(REFERENCE_READER)`. A collaborator with one implementation arrives by class, as `IdempotencyService`. A pure helper with no I/O is built by its owner. The domain keeps no Nest decorator.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `transactions` — the wager. `wager/use-cases/submit-wager.use-case.ts` is called by HTTP and the queue; read routes each have their own use case.
- `reconciliations` — `use-cases/reconcile-wallet.use-case.ts`. Compares the balance with the ledger. Does not repair it.
- `references` — `use-cases/retry-references.use-case.ts`. The scheduled worker calls the operation.
- `idempotencies` — `idempotency.service.ts`. Key, hash, and replay.
- `wallets/use-cases` — one explicit application operation per wallet route. `WalletNotFoundError` is an application error and does not depend on HTTP.
- `health` — liveness and readiness use cases. Readiness composes probes through `READINESS`; the HTTP layer translates `HealthReadinessError`.
