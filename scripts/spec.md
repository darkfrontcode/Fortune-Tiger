# Scripts

Local orchestration. No business rule, no adapter, and no import from the domain. The folder exists so an evaluator proves the delivery with one command.

## verify

`scripts/verify.ts` runs the static gate: `bun run lint`, `bun run build`, then `bun run test:unit`. No Docker, no database, no queue. It answers exit code `0` only when every step passes.

## verify:full

The argument `full` turns the same script into the complete gate: the local preflight, the static gate, the migrations, the integration suite, the audit store suite, the concurrency suite, and the end-to-end suite. Use it when PostgreSQL, MongoDB, and LocalStack are running.

The preflight reads `Environment`, never `process.env`, so `.env` supplies the targets. `DATABASE_URL` is the PostgreSQL target, `AWS_ENDPOINT_URL` is the LocalStack target, and `MONGODB_URL` is the MongoDB target. A variable that is missing, or a port that does not answer within two seconds, stops the run with the dependency name and the `docker compose up -d` hint. The script does not start a container.

## Behavior

- Steps run in order. The first failure stops the run and keeps the exit code `1`.
- Each step delegates to the `package.json` script, so the command has one owner.
- Child output goes straight to the terminal, so a failing test shows its own message.
- The script installs nothing, creates no queue, writes no file, and takes no argument other than `full`.
- `bun run verify` and `bun run verify:full` are the only entries other folders know.

## demo

`scripts/demo.ts` proves the happy path without a second terminal. It boots `AppModule` with the same validation pipe as `src/main.ts`, listens on a free port, and calls the HTTP API over `fetch`.

The sequence follows the statement: open a `BRL` wallet with `100.00`, submit a `BET` of `30.00`, repeat that request with the same `Idempotency-Key`, submit a `LOSS`, read the ledger page, compare the wallet with its ledger, and read `GET /metrics`.

Every step asserts the contract:

- liveness answers `200` with `live`, and readiness answers `200` with `ready`;
- the wallet answers `201` with an opening balance of `100.00`;
- the bet answers `200` with `PROCESSED` and a balance of `70.00`;
- the repeat answers `200` with `idempotentReplay: true`, the same `transactionId`, and the balance stored at that processing;
- the loss answers `200` with `PROCESSED` and the balance unchanged;
- the ledger page carries the `OPENING` credit and the bet debit, in that order;
- the reconciliation answers `consistent: true`, a `difference` of `0.00`, and two checked entries;
- the exposition carries the processed and duplicate counters, at least the value the demo produced.

The output is one line per check, marked `✅`. A failed assertion prints the name, the expected value, and the observed value, and the process answers exit code `1`. The application closes in a `finally`, so the workers do not stay open.

The boot needs the same `.env`, PostgreSQL, LocalStack, and applied migrations as `bun run start`. The script creates no queue, writes no file, and takes no argument. The queue path stays covered by `requests.http`, `docs/API.md`, and the integration suite.

## auth:smoke

`scripts/auth.ts` proves the `jwt` auth mode against the Keycloak profile without a second terminal. It reads the discovery document at `KEYCLOAK_URL` (default `http://127.0.0.1:8080`), asks for a token with the password grant for `KEYCLOAK_USERNAME` (default `provider-a`), boots `AppModule` with `AUTH_MODE=jwt` and the `OIDC_ISSUER` / `OIDC_JWKS_URL` from that document, and listens on a free port.

`bun run auth:smoke` asserts:

- `/health/live` answers `200`, because health stays open;
- `POST /wagering/transactions` without a token answers `401`;
- `POST /wallets` answers `201` without a token, because the wallet routes stay open in both modes;
- a bet with the token answers `200` with `PROCESSED` and a balance of `95.00`;
- the stored wager carries `provider-a` from the token, even though the body says `provider-b`;
- the same pair read under `provider-b` answers `404`;
- a forged token answers `401`.

The boot needs PostgreSQL, LocalStack, the applied migrations, and the `auth` profile. When Keycloak does not answer, the script stops with the `docker compose --profile auth up -d` hint. The token is never printed, and the script writes no file.

## openapi:export

`scripts/openapi.ts` turns the route metadata into the contract a client reads without booting the stack. It boots `AppModule` with the same validation pipe as `src/main.ts`, builds the document through `createDocument`, and writes `docs/api/openapi.json` with two-space indentation and a trailing newline.

`--check` compares the file with the code instead of writing it, and answers exit code `1` when the file is missing or stale. The pipeline runs that mode after the end-to-end suite, so a route, a DTO, or a header that changes without the checked-in document fails the build.

The export needs PostgreSQL, because `AppModule` builds the ORM; the boot opens no listener and starts no worker, because the lifecycle hooks that start them run only on `listen`. The script takes no other argument and prints the path it wrote.

## load

`scripts/load.ts` measures the HTTP path under concurrency. It calls a running API, so the client and the server do not share one event loop and the latency belongs to the server. `bun run test:load` is the entry.

The target is `http://127.0.0.1:<PORT>`, read from `Environment`. `--target=<url>` replaces it. The preflight calls `GET /health/live`; when the API does not answer, the script stops with the `bun run start` hint and exit code `1`. It starts no container, applies no migration, creates no queue, and writes no file.

Two waves are measured from the client:

- **Distinct wallets** — one wallet per request, so no two requests touch the same row. `--wallets` sets the count, default `50`.
- **Hot wallet** — one wallet receives every request, so the `SELECT FOR UPDATE` on the wallet serializes them. `--hot` sets the count, default `50`, and the opening balance is the count plus `1000.00`, so funds never reject a bet.

`--concurrency` caps the requests in flight in each wave, default `25`. Opening the wallets is setup and stays out of the measurement. A wallet is opened with `10.00` and its single bet is `1.00`.

Each wave reports the request count, the client throughput, p50, p95, p99, and the error count. A percentile uses the nearest rank over the client durations. Throughput is the count divided by the wave wall time.

After the waves, the script proves the effects:

- every distinct wallet answers `9.00` on `GET /wallets/:walletId`;
- the hot wallet answers `1000.00`, and its reconciliation is `consistent` with `difference` `0.00` and one entry per bet plus the opening;
- `GET /metrics` shows `wager_transactions_processed_total` grown by at least the two wave sizes, `lock_conflicts_total` reported, and `idempotency_duplicates_total` unchanged, because the load sends no duplicate key;
- every bet answered `200` with status `PROCESSED`.

The output is one line per check. A failed assertion prints the name, the expected value, and the observed value, and the process answers exit code `1`. The script takes the flags above and no other. `docs/load.md` records the environment, the method, the results of a local run, and the bottleneck.

## cluster

`scripts/cluster.ts` is the only entry to the local Kubernetes cluster. It takes one subcommand and reads no environment variable: the cluster name, the namespace, the overlays, the image tag, and the timeouts are constants at the top of the file.

| Command | What it does |
| --- | --- |
| `bun run cluster:up` | resolves `docker`, `kind`, and `kubectl`, starts Docker Desktop when it is not answering, creates or resumes the cluster, waits for the API and the three nodes, builds and loads the image, applies `kubernetes/overlays/local`, waits for both database instances, the queue, and Mongo, runs the migration Job, waits for both API replicas, and checks `/health/ready` through the node port |
| `bun run cluster:observability` | applies `kubernetes/overlays/observability` on top of the local one and waits for Prometheus and Grafana |
| `bun run cluster:status` | prints the nodes, the pods with their node, the services, the endpoints, and the readiness body |
| `bun run cluster:verify` | checks that the three nodes are `Ready`, the `api` Service has two endpoints, the standby answers `streaming`, the migration Job reports one success, the financial flow runs, the datalake collections exist in Mongo, and a burst of requests reaches both replicas; it prints one line per check and exits `1` on the first failure |
| `bun run cluster:render` | renders every overlay with `kubectl kustomize` and needs no cluster |
| `bun run cluster:down` | deletes the cluster and its volumes |

The migration Job is deleted before the apply, so every `cluster:up` runs the migrations again and waits for `condition=complete`. The API tolerates the window: the process boots, readiness waits on PostgreSQL and the queue, and the Deployment rolls with `maxUnavailable: 0`.

The verification reads the cluster instead of assuming it. The financial flow opens a wallet, debits it, replays the same request, reads the ledger, and compares the stored balance; the datalake check lists `audit_events` and `journey_steps` in Mongo after that flow; the load split reads `wager_transactions_processed_total` from each `api` pod before and after a burst, so the balance is proven, not the counter of one process. `cluster:verify` is the second step of the `cluster` CI job, after `cluster:up`, and it is the shape the pull request is green on.

The script owns its tooling. `kind` and `kubectl` are resolved with `Bun.which`; when one is absent, the pinned release is downloaded into `.tools/bin` and that path is used, so Docker is the only manual install. `.tools` is ignored by git. The Docker probe is bounded, because the CLI hangs instead of failing while the engine is down: fifteen seconds is enough to tell "not answering" from "slow", and the Windows start path waits for the engine to answer. A cluster that already exists is resumed with `docker start` on its node containers before the API is awaited, so a run after a Docker restart converges on the existing volumes instead of failing or recreating.

Kustomize refuses a file above its root, and the base mounts the queue bootstrap from `docker/localstack`. Every render therefore passes `--load-restrictor LoadRestrictionsNone`, and the apply pipes the rendered document to `kubectl apply --filename -`, because `kubectl apply -k` has no such flag. The reader types neither.

A failed step prints the step and stops with exit code `1`. The readiness check retries for 90 seconds, so a slow first pull does not fail the run. `cluster:render` is the step the pipeline runs, because it needs `kubectl` and no cluster.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
