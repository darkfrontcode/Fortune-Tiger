# Security

The security delivery of Fortune Tiger. The suite, the DAST plans, and the red-team live here; the constants and the workflow explain how to run each part. The behavior under test is documented in `security/spec.md`.

## What runs where

| Command | What it is | Where it runs |
| --- | --- | --- |
| `bun run test:security` | API security suite (wallet, wager, authorization, idempotency) over the real `AppModule` | local and `.github/workflows/security.yml` |
| `bun run security:zap` | OWASP ZAP **passive** scan from the OpenAPI at `/docs-json`, report written to `security/reports/passive` | local and `.github/workflows/security.yml` |
| `bun run security:zap --active` | OWASP ZAP **active** scan (spider + active rules) against a local app, report written to `security/reports/active` | local only, documented here |
| `bun run security:redteam` | honest red-team against the real `SearchSimilarEventsUseCase` | local only, behind the search stack |

## API suite

The suite lives in `src/presentation/security/tests/` and runs with the project's own runner (`bun`) and adapter (`supertest`) through `bunfig.security.toml`. The scenarios, the acceptance criteria, and the constraints are in `security/spec.md`. `createSecureApp` boots the same `AppModule` with the same validation pipe as `src/main.ts`.

```text
docker compose up -d
bun run migration:up
bun run test:security
```

A green suite keeps the coverage gate at `lines = 1.0`: the tests carry the `*.security.e2e.test.ts` suffix, which `bunfig.toml` already ignores for coverage and for the unit run.

## ZAP

`security/zap.yaml` is the passive plan: it imports the OpenAPI document (`GET /docs-json`) and runs the passive scan jobs. `security/zap-active.yaml` is the local active plan: it spiders the context and runs the active rules. Both write a `traditional-html` report under `security/reports/`.

The script `scripts/security-zap.ts` probes `/health/live` on the local app, then runs the ZAP container against it.

```text
# passive (the pipeline mode)
bun run security:zap

# active (local only — it sends attack payloads; never run it against a shared environment)
bun run security:zap --active
```

The active scan is a deliberate manual step: it sends crafted payloads and may take minutes, so it stays off the pipeline. No credential is scanned, because `AUTH_MODE` stays `anonymous` and the app holds no real secret.

## Red-team

`scripts/security-redteam.ts` drives the real `SearchSimilarEventsUseCase` with crafted queries — data-exposure probes, an instruction-injection string, a limit abuse, an empty query, and an over-long query — and checks that every result carries only the safe projection (`id`, `eventType`, `kind`, `status`, `failureCode`, `score`, `wagerId`, `occurredAt`) and never an amount, a `providerId`, a currency, a token, or a secret. It also checks that the requested `limit` is capped at `VECTOR_SEARCH_TOP_K`. It is the AI surface red-team, adapted to a tool that has no generative agent: it validates the guarantee the tool can keep, that input is a query and output is the safe projection.

```text
docker compose --profile search up -d
bun run search:seed
bun run security:redteam
```

When the search stack is down, the script exits with the hint instead of a stack trace.

## Layout

`security/zap.yaml` — the passive scan plan.
`security/zap-active.yaml` — the active scan plan (local only).
`security/reports/` — where ZAP writes the HTML reports.
`security/spec.md` — the security delivery spec (objectives, scenarios, acceptance criteria).

All project text is English, including this file. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`.
