# Docker

The compose file runs three things: the local dependencies, the image, and the optional identity provider.

## Services

| Service | Profile | What it does |
| --- | --- | --- |
| `postgres` | default | PostgreSQL 16, database `fortune_tiger`, healthcheck through `pg_isready` |
| `localstack` | default | SQS, with the queues created by the ready hook in `docker/localstack` |
| `keycloak` | `auth` | Keycloak 26 with the realm in `docker/keycloak`; needed only by `AUTH_MODE=jwt` |
| `migrate` | `app` | one-shot service, runs `bun run migration:up`, exits `0` before the API starts |
| `app` | `app` | the API and its workers, built from the root `Dockerfile`, healthcheck on `/health/live` |

`docker compose --profile app up --build --wait` builds the image once, applies the migrations, and starts the application on `3000`. The application waits for PostgreSQL, LocalStack, and the migration service, and it reports healthy only when `/health/live` answers.

## Image

`oven/bun:1.4.3`. The build installs the locked dependencies, copies the source, and runs `src/main.ts`. It carries no test file, no development dependency beyond what the runtime imports, and no secret. Every value the container needs arrives as an environment variable, so the same image runs in compose and in a deployment.

The image holds the HTTP API, the outbox publisher, the reference worker, and the queue consumer in one process, because `RuntimeService` starts all three. A deployment that wants to split them runs the same image with a different entry, and the roles stay independent because none of them shares memory.

## Queues

`docker/localstack/01-queues.sh` runs on the LocalStack ready hook and creates `wager-transactions.fifo` and `wager-transactions-dlq.fifo`. Creating a queue twice is a no-op for LocalStack, so a restart is safe.

All project text is English. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`.
