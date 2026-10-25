# Docker

The compose file runs the local dependencies, the image, the optional identity provider, and an optional observability pair.

## Services

| Service | Profile | What it does |
| --- | --- | --- |
| `postgres` | default | PostgreSQL 16, database `fortune_tiger`, healthcheck through `pg_isready` |
| `mongo` | default | MongoDB 7, database `fortune_tiger_audit`, healthcheck through a `ping` command |
| `localstack` | default | SQS, with the queues created by the ready hook in `docker/localstack` |
| `keycloak` | `auth` | Keycloak 26 with the realm in `docker/keycloak`; needed only by `AUTH_MODE=jwt` |
| `migrate` | `app` | one-shot service, runs `bun run migration:up`, exits `0` before the API starts |
| `app` | `app` | the API and its workers, built from the root `Dockerfile`, healthcheck on `/health/live` |
| `prometheus` | `observability` | scrapes `app:3000/metrics` every five seconds, evaluates the rules in `docker/alerting/rules`, and keeps one day of samples |
| `alertmanager` | `observability` | receives the alerts Prometheus raises and emails `darkfrontcode@gmail.com` through SMTP |
| `grafana` | `observability` | serves the provisioned `Fortune Tiger` dashboard on `3001`, with Prometheus as its datasource |

`docker compose --profile app up --build --wait` builds the image once, applies the migrations, and starts the application on `3000`. The application waits for PostgreSQL, MongoDB, LocalStack, and the migration service, and it reports healthy only when `/health/live` answers.

## Image

`oven/bun:1.4.3`. The build installs the locked dependencies, copies the source, and runs `src/main.ts`. It carries no test file, no development dependency beyond what the runtime imports, and no secret. Every value the container needs arrives as an environment variable, so the same image runs in compose and in a deployment.

The image holds the HTTP API, the outbox publisher, the reference worker, and the queue consumer in one process, because `RuntimeService` starts all three. A deployment that wants to split them runs the same image with a different entry, and the roles stay independent because none of them shares memory.

## Queues

`docker/localstack/01-queues.sh` runs on the LocalStack ready hook and creates `wager-transactions.fifo` for requests, `wager-transactions-dlq.fifo` behind it, `wager-events.fifo` for integration events, and `wager-events-dlq.fifo` behind the events channel. Creating a queue twice is a no-op for LocalStack, so a restart is safe.

The same script is mounted by the Kubernetes LocalStack pod, generated from this file, so the two paths cannot drift. The cluster itself lives in `kubernetes/`, and `docs/kubernetes.md` is its operator guide.

## Observability

```bash
docker compose --profile app --profile observability up -d
```

`docker/prometheus/prometheus.yml` scrapes `app:3000/metrics` every five seconds under the `fortune-tiger` job. A target that is down means the API is not answering; the panel keeps the last samples instead of hiding the gap. The retention is one day, so the stack stays small.

`docker/grafana/provisioning/` mounts the datasource and the dashboard provider, and `docker/grafana/dashboards/fortune-tiger.json` is the `Fortune Tiger` dashboard with four panels:

1. transactions by status: processed, rejected, and failed per second;
2. replays, retries, and dead letters per second;
3. processing latency at p50, p90, and p99;
4. outbox lag at p50, p90, and p99, with lock conflicts on the same axes as a rate.

Every panel reads the names from `application/observability/data`, so an adapter cannot invent one and a dashboard cannot drift. Grafana allows anonymous viewing in this profile, so `http://localhost:3001` opens the dashboard without a login; `admin`/`admin` is the account for an edit. The profile is optional: `docker compose --profile app up -d` keeps the API alone, and `GET /metrics` still answers a manual scrape.

`docker/alerting/rules/fortune-tiger.rules.yml` is the alert set: 8 rules that fire when the API is down, the process memory is high, a dead letter arrives, a retry storm is being scheduled, the outbox is falling behind, the audit store or the journey store cannot persist, or a reconciliation finds a divergence. Each rule reads a real metric; the memory rule needs the process metrics that `PrometheusMetric` registers through `collectDefaultMetrics`.

`docker/alerting/alertmanager.yml` runs `alertmanager`, routes every alert to the `email` receiver addressed to `darkfrontcode@gmail.com`, and reads the SMTP password from `docker/alerting/smtp-password` (gitignored — the operator puts a Gmail App Password there). `docker/prometheus/prometheus.yml` points the `alerting.alertmanagers` block at `alertmanager:9093`, so the two compose services wire the pair. Email is the receiver this delivery ships; PagerDuty would be one more `webhook_configs` block on the same `alertmanager`. `http://localhost:9093` opens the Alertmanager UI in this profile.

All project text is English. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`.
