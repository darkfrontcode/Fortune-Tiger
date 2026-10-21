# Application

Use cases. It joins the domain and the SQL transaction boundary. No SQL and no HTTP.

A folder is plural, one word, no hyphen. The evaluator reads the folder name and knows what is inside.

There is no `shared` folder here. A port that a use case plugs in lives in `protocols`. `TheoryProtocol` is not a use case. It lives in `infrastructure/protocols`. This layer does not import `presentation`. Domain error text does not live here. It stays in the concept, in `data/messages.data.ts`, one `UPPER_SNAKE_CASE` constant per phrase ending with `_MESSAGE`, reexported by `data/index.ts` with `export *`.

Each folder has an English `spec.md`. The code follows that spec. When the code arrives, one file per folder: a short singular name plus the Nest role. No hyphen in the middle of the concept.

All project text is English, including the root `README.md`.

History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this folder starts doing something.

- `transactions` — the wager. `wager.service.ts` lives here. HTTP and the queue call the same use case.
- `reconciliations` — `reconciliation.service.ts`. Compares the balance with the ledger. Does not repair it.
- `idempotencies` — `idempotency.service.ts`. Key, hash, and replay.
