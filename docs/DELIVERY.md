# Delivery

A reviewer's path through Fortune Tiger: what to run, what to expect, and where the proof lives.

The statement is in [`docs/challenge-original.md`](challenge-original.md). The folder map is in [`ARCHITECTURE.md`](../ARCHITECTURE.md). Every folder carries an English `spec.md` written before its code.

## Prerequisites

- Bun 1.x
- Docker with Compose, for PostgreSQL 16, MongoDB 7, and LocalStack
- Ports `3000`, `5432`, `27017`, and `4566` free

## Five minutes

```bash
bun install
cp .env.example .env
docker compose up -d
bun run migration:up
bun run verify
bun run demo
```

What each command answers:

| Command | What it proves |
| --- | --- |
| `docker compose up -d` | PostgreSQL 16, MongoDB 7, and LocalStack, with the FIFO queues created by the ready hook in `docker/localstack` |
| `bun run migration:up` | the schema is versioned and reversible |
| `bun run verify` | lint, TypeScript strict, and the unit suite pass, with no dependency running |
| `bun run demo` | the happy path against a live application: wallet, bet, replay, loss, ledger, reconciliation, metrics |

The demo boots the application on a free port, so it does not need `bun run start` in another terminal, and it does not collide with a server already on `3000`.

## Optional profiles

```bash
docker compose --profile app --profile observability up -d
```

Adds Prometheus on `9090` and Grafana on `3001`, with the `Fortune Tiger` dashboard provisioned from `docker/grafana/`. The panels read transactions by status, replays, retries, dead letters, processing latency, outbox lag, and lock conflicts.

```bash
docker compose --profile auth up -d
bun run auth:smoke
```

Starts Keycloak with the demo realm and proves the `jwt` mode end to end: `401` without a token, a wallet still open, a bet accepted with the token, the provider read from the claim even when the header and the body spoof another one, `404` under that provider, and `401` for a forged token.

To run the whole stack in containers instead, with the migration applied by a one-shot service:

```bash
docker compose --profile app up -d --build
docker compose --profile app ps
```

The `app` service reports `healthy` when `/health/live` answers, and `GET /health/ready` answers `ready` when PostgreSQL and SQS are reachable. The image is the root `Dockerfile`, and [`docker/spec.md`](../docker/spec.md) describes what it carries.

## The cluster

```bash
bun run cluster:up
```

Builds the same image, creates a `kind` cluster with three nodes inside Docker, loads the image into the nodes, applies [`kubernetes/overlays/local`](../kubernetes/overlays/local), waits for both PostgreSQL instances, LocalStack, and Mongo, waits for the migration Job, waits for both API replicas, and checks `http://127.0.0.1:30080/health/ready`. Docker is the only prerequisite: `kind` and `kubectl` are reused from `PATH` or downloaded into `.tools/bin`, and Docker Desktop starts by itself on Windows when it is closed.

| Command | What it proves |
| --- | --- |
| `bun run cluster:up` | the application runs as two replicas on two nodes, over a primary with a streaming standby, with the datalake in Mongo |
| `bun run cluster:observability` | Prometheus scrapes each replica and Grafana serves the same dashboard compose serves |
| `bun run cluster:status` | the nodes, the pods with their node, the endpoints, and readiness |
| `bun run cluster:verify` | the shape is proven: nodes, endpoints, replication, migration, the financial flow, the datalake collections, and both replicas serving |
| `bun run cluster:render` | every overlay renders, with no cluster needed |
| `bun run cluster:down` | the cluster and its volumes are gone |

A repeated wager through the node port still produces one debit, whichever replica answers, because the wallet lock, the outbox claim, and the inbox row live in PostgreSQL. Six pods run at rest: the two `api` replicas on different workers, the PostgreSQL primary on one worker with its streaming standby on the other, LocalStack, and Mongo, where the audit timeline and the journey store live. The `api` Service is the load balancer in front of the replicas. [`docs/kubernetes.md`](kubernetes.md) carries the topology, the failure drills, and the limits.

## Try the API by hand

```bash
bun run start
```

Then open [`requests.http`](../requests.http) in the VS Code REST Client or the JetBrains HTTP client. The file walks the same steps as the demo, plus the idempotency conflict, the insufficient funds rejection, a reversal without a reference, pagination, and the `404` cases.

With the API running, `http://localhost:3000/docs` opens the whole contract in the Swagger UI, and `http://localhost:3000/docs-json` answers the OpenAPI 3 document.

The route rules are in [`docs/API.md`](API.md) and in [`src/presentation/http/spec.md`](../src/presentation/http/spec.md).

## The full gate

```bash
bun run verify:full
```

The gate reads `.env` through `Environment`, checks that PostgreSQL, MongoDB, Redis, and LocalStack answer within two seconds, then runs the migrations, the integration suite, the audit store suite, the journey store suite, the concurrency suite, and the end-to-end suite. The first failure stops the run with exit code `1`.

The concurrency suite starts six independent application processes against the same database: the same bet 50 times becomes one debit, two bets of 80 on a balance of 100 leave one processed and one rejected, two rollbacks of one bet leave one processed, and the stored balance always equals the balance rebuilt from the ledger. The same suite carries the fault injection: a TCP proxy in front of PostgreSQL, `503` during the outage, and recovery without a restart.

The OpenAPI document is checked in; `bun run openapi:export --check` rebuilds it from the code and fails when the file is stale, and the pipeline runs that check after the end-to-end suite.

## The security gate

```bash
bun run test:security
```

Runs the API security suite over the real `AppModule`, with the same validation pipe as `src/main.ts`. It sends the calls a hostile provider would: malformed money, an insufficient bet, two simultaneous bets against one balance, a refund pointing at the wrong kind, a reversal twice, a duplicate idempotency key with a different payload, and a foreign provider reading someone else's audit or journey. Every answer matches the status table the API already promises — `400`, `409`, `422`, `404`, or one `PROCESSED`.

The suite carries the `*.security.e2e.test.ts` suffix, so the 100% line coverage gate is unchanged. `.github/workflows/security.yml` runs it on `main`, `staging`, and every pull request, with the same services as `CI`.

```bash
bun run security:zap
```

Runs the OWASP ZAP passive scan against a running API: `bun run start` first, then the scan imports `GET /docs-json` and writes the HTML report to `security/reports/passive`. `bun run security:zap --active` runs the active scan locally, never in the pipeline. `bun run security:redteam` drives the real semantic search tool with crafted queries and proves it never projects an amount, a balance, a provider id, a currency, or a secret; it needs the `search` profile and a seeded index.

The behavior under test, the scope, and the acceptance criteria are in [`security/spec.md`](../security/spec.md); the operator path is in [`security/README.md`](../security/README.md); the reasoning is in [`docs/adr/0016-security-testing.md`](adr/0016-security-testing.md).

## Where to read

- [`README.md`](../README.md) — the four folders, the stack, and the commands.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the layer rules and the composition.
- [`docs/API.md`](API.md) — routes, headers, status, error bodies, and failure codes.
- [`docs/api/openapi.json`](api/openapi.json) — the same contract, machine-readable and checked in.
- [`docs/adr/`](adr/) — sixteen records, one per decision, with the alternative that lost.
- [`docs/testing.md`](testing.md) — what each suite covers and why.
- [`security/spec.md`](../security/spec.md) — the security baseline, the DAST plans, and the red-team.
- [`docs/load.md`](load.md) — the load method, the measured waves, and the honest limit.
- [`docs/kubernetes.md`](kubernetes.md) — the cluster, the drills, and the limits.
- [`EVIDENCE.md`](../EVIDENCE.md) — the last local run: counts, constraints, and the honest limits.
- [`EVALUATION.md`](../EVALUATION.md) — the section 14 checklist against the code.

The code reads top to bottom: `src/domain` holds `Money`, `Wallet`, `Ledger`, and `Wager`; `src/application` holds the use cases, the idempotency rule, the mediators, the ports, and the audit and journey queries; `src/infrastructure` holds MikroORM, Mongoose, SQS, the inbox and outbox, the logger, and the metrics; `src/presentation` holds HTTP and health.

## What stands out

- **The domain decides.** `Money` uses `decimal.js` with exact scale, `Wallet` never goes negative, the ledger entry is immutable and checked by `balanceBefore ± money = balanceAfter`, and the wager state machine only moves forward.
- **The database is the final guarantee.** `SELECT FOR UPDATE` on the wallet inside the same SQL transaction as the ledger, the wager, the inbox, and the outbox. Unique constraints on the idempotency key and on the provider pair back the in-memory checks.
- **Delivery is at-least-once, and the effect is single.** FIFO is an optimization; the inbox deduplicates redelivery and the idempotency rule deduplicates the provider's retry.
- **The observability is scrapeable.** `GET /metrics` answers the Prometheus exposition from the process that served the request, with names owned by the application, and the optional `observability` profile ships a dashboard that reads them.
- **The spec arrives before the code.** Every folder has an English `spec.md`, and a behavior that is not in the spec is not in the code.

## Limits, stated up front

- Delivery is **at-least-once**, not exactly-once. A crash after the commit and before the ack redelivers the message; the inbox keeps the effect single.
- Ledger immutability is enforced by the application, not by a database grant. The unique `transaction_id` prevents a duplicate row, not an `UPDATE`.
- Auth has two modes. The default `anonymous` mode keeps `AuthGuard` permissive and `AnonymousProviderIdentity` trusts the caller, so a local run needs no identity provider. `AUTH_MODE=jwt` verifies the bearer token against the Keycloak realm key set and reads the `provider_id` claim; Keycloak itself is an optional compose profile, and the CI keeps `anonymous`.
- The audit timeline and the journey are **eventually consistent** and live in MongoDB. The audit is fed by the outbox; the journey is recorded stage by stage. Neither is a transactional record, MongoDB is not part of readiness, and a MongoDB outage delays them — never a balance, never a rollback.
- OpenTelemetry, double-entry accounting, and partial reversal are out. The Prometheus exposition is in.
- The load test is a measurement, not a gate. `bun run test:load` reports the two waves on the machine it runs on, with no RPS target and no CI job; [`docs/load.md`](load.md) states the method and the limit.
- The cluster is one machine. Three nodes share a kernel and a disk, the standby has no automatic failover, and no autoscaler is provisioned; [`docs/kubernetes.md`](kubernetes.md) states the rest.
