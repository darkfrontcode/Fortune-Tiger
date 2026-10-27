# Security

Automated security testing for Fortune Tiger. It does not change production behavior, and it does not add a payment service. The delivery has four parts: an in-repo API security suite with the project's own runner and adapter, OWASP ZAP for DAST, an honest AI red-team against the MCP search tool, and one GitHub Actions workflow wired into `main` and `staging`.

The deliverable is tests and docs, not a product. No test invents a safety feature; every assertion checks a behavior the code already implements.

## Objectives

- Catch a regression in a financial rule, an auth boundary, an idempotency guarantee, or a data-exposure guarantee before it reaches `main` or `staging`.
- Give the evaluator a repeatable security baseline that runs locally and in the pipeline.
- Prove the HTTP surface against the table in `src/presentation/http/spec.md`, and prove the MCP search tool against `src/infrastructure/mcp/spec.md`.
- Keep the coverage gate at 100% lines and the CI green: the `*.e2e.test.ts` suffix keeps the suite out of the unit run, out of `test:e2e`, and out of the coverage threshold.

## Scope

In:

- The HTTP API covered by `src/presentation/http/spec.md`: `POST /wallets`, `GET /wallets/:walletId`, `GET /wallets/:walletId/ledger`, `POST /wallets/:walletId/reconciliation`, `POST /wagering/transactions`, `GET /wagering/transactions/:transactionId`, `GET /wagering/transactions/:transactionId/audit`, `GET /wagering/transactions/:transactionId/journey`, `GET /providers/:providerId/wagering/transactions/:externalTransactionId`, and `GET /providers/:providerId/players/:playerId/journey`.
- The auth boundary implemented today: `AuthGuard` with two modes. The suite runs over `anonymous` (the default), where `AnonymousProviderIdentity` trusts `X-Provider-Id` or the body `providerId`. The `jwt` mode is exercised by `scripts/auth.ts` and is not re-run here, because it needs Keycloak; the workflow keeps `AUTH_MODE=anonymous`.
- The financial rules in `src/domain`: `Money` rejects a negative, over-scaled, or non-decimal amount; `Wallet` never goes negative; a `BET` beyond the balance is `REJECTED INSUFFICIENT_FUNDS`; a reversal needs a reference; the ledger entry must be balanced; one idempotency key produces one effect; the same key with a different payload is `409`.
- The MCP search tool in `src/infrastructure/mcp`, through the real `SearchSimilarEventsUseCase` and the safe projection in `formatSearchOutput`, when the search stack is up and `VECTOR_SEARCH_ENABLED` is true.

Out:

- Keycloak and the `jwt` mode (verified by `scripts/auth.ts`; the workflow stays anonymous).
- The cluster, OpenTelemetry, a load test, and the jewelry pack. No new production capability is added.
- Any generative agent: Fortune Tiger has none. The MCP tool is a deterministic semantic search. Promptfoo's generative red-team does not apply to a tool with no free-form answer; the red-team here drives the real tool and checks the guarantee the tool can keep: input is a query, and output carries no financial or caller data.
- Destructive or paid scanning. ZAP runs passive on the CI against the app started in the workflow; active scanning is a documented local command only.

## Scenarios

### Wallet

| Scenario | Assertion |
| --- | --- |
| Insufficient balance | `POST /wagering/transactions` with a `BET` larger than the balance answers `422` and the body carries `failureCode: INSUFFICIENT_FUNDS`; the wallet balance is unchanged; the replay of the same key answers `200` with `idempotentReplay: true`. |
| Negative amount | `POST /wallets` and `POST /wagering/transactions` reject a negative `amount` with `400`. |
| Over-scaled amount | an amount with more than two decimal places answers `400`. |
| Unreadable amount | an empty, non-numeric, or bare-number amount reaches the DTO and answers `400`. |
| Foreign currency | a wallet created in `BRL` rejects a wager in another currency through the wallet rule, and the reconcile answer reports the truth. |
| Access to another player's wallet | a wallet is readable by its id, because the id is the capability the contract exposes; an unknown id answers `404`. |
| Ledger integrity | after a rejected bet, the wallet's reconciliation answers `consistent: true` and `checkedEntries` counts the opening and the successful bets only. |
| Concurrency | two `BET` requests with distinct idempotency keys and a wallet balance that admits one of them answer one `200` and one `422` (or two `200` when the balance admits both); the final balance equals the invariant `opening − bets` regardless of arrival order. |

### Wager

| Scenario | Assertion |
| --- | --- |
| Invalid bet amount | a `BET` with a negative amount, an over-scaled amount, or a malformed `money` answers `400`. |
| Duplicate settlement | re-sending the same idempotency key answers `200` with `idempotentReplay: true`, the balance is debited once, and the ledger has one entry for the original effect. |
| `OPENING` is internal | submitting `kind: OPENING` answers `422` with `failureCode: OPENING_NOT_ALLOWED`. |
| Reversal without a reference | a `REFUND` or `ROLLBACK` without `referenceExternalTransactionId` answers `400`; with a reference to a missing transaction it answers `202` `PENDING_REFERENCE`. |
| Reference discipline | a `REFUND` that points at a `WIN` is refused by the domain with `INVALID_REFERENCE_KIND` and never moves the balance; a second reversal of the same reference is refused with `REFERENCE_ALREADY_REVERSED`. |
| Result manipulation | a `BET` that would take the balance negative cannot fabricate a credit: it answers `422` `INSUFFICIENT_FUNDS`, and no ledger entry appears. |
| Consistency | after processed bets, the reconciliation answers `consistent: true`; a `LOSS` answers `200` without changing the balance, and a wager read returns the same status the submit returned. |
| `FAILED` | the status table in `src/presentation/http/spec.md` maps it; the mapping is proven by the presentation unit tests, and the e2e verifies a business rejection answers `422` and a processed request answers `200`, never a `503` for a normal request. |

### Authorization

| Scenario | Assertion |
| --- | --- |
| Caller identity | the `anonymous` mode resolves the provider from `X-Provider-Id` over the body `providerId`: a wager submitted with a header `provider-a` and a body `provider-c` is recorded under `provider-a`, and the read returns that provider. |
| Cross-provider read | the wager-by-id and provider-pair reads are keyed by the identifiers the caller presents, like the wallet: `GET /wagering/transactions/:transactionId` answers `404` for an id that was never recorded, and the provider-pair read answers `404` for a pair that was never recorded. The journey and audit reads of a wager of another provider answer `404` (`WagerNotFoundError`), because those two routes enforce the provider scope. |
| Journey and audit scope | the routes answer `404` for a wager of another provider and `200` for the caller's own, matching `src/presentation/http/spec.md`. |
| Player isolation | the player journey answers `404` for a provider other than the caller and `200` with `{ items }` for the caller's own provider, matching the provider scope in `src/presentation/http/spec.md`. |

### Idempotency

| Scenario | Assertion |
| --- | --- |
| Duplicate delivery | the same key sent twice: the first answers `200`, the second answers `200` with `idempotentReplay: true`, and the balance is debited once. |
| Different payload | the same key with a different amount answers `409` and the balance does not change. |
| Repeat after failure | a `BET` that fails on the first attempt and succeeds on the retry (insufficient funds followed by a new key) produces one debit; a `REFUND` that fails on the first attempt and succeeds on the retry produces one credit. |
| No double effect | after a processed bet, the ledger has exactly one entry for the bet and the reconciliation is `consistent: true`. |
| Replay of a terminal result | re-sending the key of a `REJECTED` wager answers `200` with `idempotentReplay: true` and the original `failureCode`, without a second attempt. |

### MCP red-team (the AI surface)

| Scenario | Assertion |
| --- | --- |
| Data exposure | a crafted query — asking for balances, wallets, or credentials — returns only the fields `formatSearchOutput` prints (`score`, `eventType`, `kind`, `status`, `failureCode`, `wagerId`, `occurredAt`); it never returns an amount, a `providerId`, a currency, or a token. |
| Instruction injection (RAG poisoning) | a query that embeds "ignore previous instructions" or "system:" is treated as a search string: it is embedded as a query, matches the seeded index, and returns the same-shaped output; no instruction is executed and no datum that the index does not hold appears. |
| Tool abuse / limits | the input schema rejects an empty `query`, and `SearchSimilarEventsUseCase` refuses an empty or over-long query with `INVALID_SEARCH_QUERY_MESSAGE` and caps `limit` to `VECTOR_SEARCH_TOP_K`; output is read-only and the tool lists no write operation. |
| Credential probing | no query returns a secret, a password, or a connection string, because `formatSearchOutput` never prints one and the index holds synthesized rows, not credentials. |

The red-team drives the real search tool (`SearchSimilarEventsUseCase`) like `scripts/search-check.ts` does, over the search stack. It is a script, not a unit test: it needs `atlas-local`, Ollama, the seeded index, and `VECTOR_SEARCH_ENABLED=true`, so it stays manual and out of the API suite.

## Acceptance criteria

1. `bun run test:security` runs the API suite with the project's own stack (`bun` + `supertest`) and the stack up (`docker compose up -d`, `bun run migration:up`), and every scenario above stays green.
2. The suite is honest: it checks the contracts in `src/presentation/http/spec.md`, `src/domain/*/spec.md`, and `src/infrastructure/mcp/spec.md`, and it never mocks the financial stack.
3. `bun run security:redteam` drives the real search tool with the scenarios above and stays green when the search stack is up; it exits with a clear message when the stack is down.
4. `security/zap.yaml` runs a ZAP passive scan against the OpenAPI of the running app locally (`bun run security:zap`), and reports to `security/reports/passive/`.
5. `.github/workflows/security.yml` runs the API suite and the ZAP passive scan against the app started in the job for pushes to `main` and `staging` and for pull requests against them, and uploads the ZAP report and the test log as artifacts.
6. The coverage gate stays at `lines = 1.0`, the root `README.md` stays updated, and a `docs/adr/` note records the decision.
7. No paid service is required. No payload, no credential, and no seed in the repo is real.

## Dependencies and constraints

- `supertest` is already a devDependency; `bun` is the runner; `createSecureApp` in `src/presentation/security/test-app.ts` boots the real `AppModule` with the same validation pipe and Swagger mount as `src/main.ts`. The suite reuses both — no Jest, no new test adapter.
- The API suite needs PostgreSQL, SQS (LocalStack), MongoDB, and Redis up, because `createSecureApp` boots the real app. It runs in the workflow job that starts the same services `ci.yml` starts.
- ZAP runs as a Docker image (`ghcr.io/zaproxy/zaproxy`), passive only in the pipeline, active only locally against a local app. It needs the app reachable on `localhost:3000` with `/docs-json`.
- The red-team needs the search stack (`docker compose --profile search up -d`), the Ollama model, and the seeded index. It is manual and out of the workflow, and it uses synthesized rows.
- No test writes to `main` or a shared environment. Every id, player, and provider pair is generated per run, so the suite stays repeatable against a database that other suites already used.
- `AUTH_MODE` stays `anonymous` in the workflow. The `jwt` mode is proven by `scripts/auth.ts`, as before.

All project text is English, including this file. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
