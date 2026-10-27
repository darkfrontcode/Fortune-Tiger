# 0016. Security testing in the repository

- Status: Accepted
- Date: 2026-10-27

## Context

The delivery has a financial rule, an auth boundary, an idempotency guarantee, and a read model. Each one is already exercised by the unit, integration, concurrency, and end-to-end suites, but no suite answers the question a security reviewer asks first: does the HTTP surface keep those guarantees under a hostile caller, and does the pipeline notice when one of them regresses?

The question is narrow. The repository must add a security baseline that runs with the tools it already carries — Bun, Supertest, the real `AppModule` — and one dynamic scan that reads the live OpenAPI document. It must not add a paid service, must not change a production behavior, and must not move the line-coverage gate from `1.0`.

## Decision

Four parts, one commit, all in the repository.

1. **An API security suite** in `src/presentation/security/tests/`, run by `bun run test:security` through `bunfig.security.toml`. The files are named `*.security.e2e.test.ts`, so `bunfig.toml` already ignores them for coverage and for the unit run: the gate stays at 100% lines. `createSecureApp` boots the same `AppModule` with the same `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) and the same Swagger mount as `src/main.ts`, so the suite proves the input filter a provider actually reaches. Four files: wallet (amount validation, insufficient funds, ledger integrity, concurrency under the row lock), wager (reference discipline, terminal status, kind refusal), idempotency (duplicate delivery, replay, payload conflict), and authorization (caller identity, provider scope on the audit and journey reads).
2. **OWASP ZAP** as the dynamic scan. `security/zap.yaml` imports `GET /docs-json` and runs the passive scan jobs; `security/zap-active.yaml` spiders and runs the active rules. `scripts/security-zap.ts` probes `/health/live`, then runs the official image (`ghcr.io/zaproxy/zaproxy`) with `--add-host host.docker.internal:host-gateway` and writes the `traditional-html` report under `security/reports/`. Passive runs in the pipeline; active is a documented local command, because it sends crafted payloads.
3. **A red-team** against the real `SearchSimilarEventsUseCase` in `scripts/security-redteam.ts`, manual and outside the pipeline. It sends data-exposure probes, an instruction-injection string, a limit abuse, an empty query, and an over-long query, and asserts that a result never carries a key outside the safe projection — never an amount, a `providerId`, a currency, a token, or a secret — and that the requested limit is capped at `VECTOR_SEARCH_TOP_K`. There is no generative agent to attack: the tool has no LLM in the loop, so the honest test is the guarantee the tool can keep — input is a query, output is the safe projection.
4. **One workflow**, `.github/workflows/security.yml`, on the same triggers as `CI`: it starts PostgreSQL, LocalStack, MongoDB, and Redis, runs the migrations, runs `test:security`, starts the API, runs the passive ZAP scan, and uploads the report and the suite log.

## Consequences

- A regression in a financial rule, an auth boundary, an idempotency guarantee, or a data-exposure guarantee fails the pipeline before it reaches `main` or `staging`.
- The suite is honest about scope: the wager-by-id and provider-pair reads are keyed by the identifiers the caller presents, and only the audit and journey reads enforce the caller's provider. The spec states that boundary instead of inventing a check the code does not have.
- The coverage gate is untouched: the security tests inherit the existing `*.e2e.test.ts` ignore, so the 100% line threshold measures the same scope it measured before.
- The passive scan keeps a report as an artifact but gates only on ZAP completing, not on an alert count, so a heuristic never fails a build on a false positive. The active scan stays a local, deliberate step.
- The red-team needs the search profile (`atlas-local` plus Ollama) and a seeded index; it exits with the hint when the stack is down, so a plain local run is unchanged.
