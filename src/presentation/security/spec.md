# Security tests

The HTTP security suite. It exercises the real `AppModule` through `createSecureApp` and `supertest`, with the full stack (PostgreSQL, LocalStack, MongoDB, Redis) up, exactly like `src/presentation/http/tests`. The suite sits in its own folder so `test:unit`, `test:coverage`, and the 100% line gate never see it: every file here is an e2e test, and the root `bunfig.toml` ignores `**/presentation/**/tests/*.e2e.test.ts`.

The scenarios, the acceptance criteria, and the tool config live in `security/spec.md` at the repository root. This folder is the Fase 1 delivery of that spec: `bun run test:security` runs it with the migration applied and the services up.

Every assertion checks a behavior the code already implements — the status table in `src/presentation/http/spec.md`, the guards in the domain, and the idempotency rule in `src/application/idempotencies/spec.md`. No test adds a safety feature. No amount, balance, or identifier in the suite is real. Ids are generated per run, so the suite stays repeatable on a shared database.

## Files

One file per concern, named `{concern}.security.e2e.test.ts`:

- `wallet.security.e2e.test.ts` — insufficient balance, negative, bare, over-scaled, and malformed amounts, foreign currency, an unknown wallet, ledger integrity, and concurrency.
- `wager.security.e2e.test.ts` — malformed bets, duplicate settlement, `OPENING`, reversals and their references, a fabricated credit, `LOSS`, and the ledger consistency after each answer.
- `authorization.security.e2e.test.ts` — caller identity in the anonymous mode, an unknown identifier, and the provider-scoped audit, journey, and player journey reads.
- `idempotency.security.e2e.test.ts` — duplicate delivery, payload conflict, a retry after a refused attempt, and the single-effect guarantee.

The `FAILED` status is a permanent infrastructure error, and no HTTP route produces it, so it is proven by the domain and use-case unit tests rather than by this suite.

The provider identity in these tests is the `anonymous` mode: `AuthGuard` resolves `X-Provider-Id`, falls back to the body `providerId`, and trusts the caller. The `jwt` mode is proven by `scripts/auth.ts`, and the workflow keeps `AUTH_MODE=anonymous`.

All project text is English. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
