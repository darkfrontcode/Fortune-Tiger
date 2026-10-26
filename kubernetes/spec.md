# Kubernetes

The same application, running on a real Kubernetes cluster that lives inside Docker. Three nodes, six workloads, and the guarantees the rest of this delivery proves on one process.

The folder is declarative: no manifest is generated at apply time, and no step needs a command the reader cannot see. `bun run cluster:up` is the only entry.

## Tooling

| Piece | Choice | Why |
| --- | --- | --- |
| Cluster | `kind` 0.33 | every node is a Docker container, so the cluster starts in seconds and needs no virtual machine. `minikube` gives a richer feature set and `k3d` starts faster, but neither puts the whole cluster inside Docker as directly as `kind` on a machine that has no VM budget. |
| Manifests | Kustomize | `kubectl` ships it, so the delivery adds no second package manager and no chart to render. An evaluator reads plain Kubernetes YAML and one overlay. |
| Packaging | none | Helm is the market default for distributing a chart. This delivery distributes nothing, and the three overlays are shorter than the chart that would wrap them. |
| Database | PostgreSQL 16 | same image as compose, so the schema and the migrations are the ones already tested. |
| Queue | LocalStack 3 | same adapter as compose. The queue bootstrap is the same script. |

`kubectl` reads `kubernetes/overlays/*`. Nothing here calls the cluster from the application code.

## Cluster

`kind/cluster.yaml` declares one control plane and two workers. The workers exist so the two API replicas and the two database instances land on different machines and so the spread rules have somewhere to go.

The control plane publishes three host ports:

| Host | Node | Route |
| --- | --- | --- |
| `30080` | `30080` | `api` |
| `30090` | `30090` | Prometheus |
| `30030` | `30030` | Grafana |
| `30093` | `30093` | Alertmanager |

The default storage class of `kind` is `standard`, backed by the local path provisioner, and both database volumes use it.

## Workloads

| Workload | Kind | Replicas | Role |
| --- | --- | --- | --- |
| `postgres-primary` | StatefulSet | 1 | writes, and the only target of the API |
| `postgres-replica` | StatefulSet | 1 | streaming standby, read-only |
| `localstack` | Deployment | 1 | SQS, with the four FIFO queues |
| `mongo` | Deployment | 1 | MongoDB read models, the audit timeline and the journey store |
| `redis` | Deployment | 1 | Redis, the read cache for wallets and wagers |
| `api` | Deployment | 2 | HTTP API, outbox publisher, reference worker, queue consumer |
| `migrate` | Job | 1 | `bun run migration:up`, once per apply |

Seven pods at rest, and the two API replicas are separate processes with separate memory.

Two components stay at one replica on purpose. PostgreSQL has one writer, and the second instance is the standby, not a second writer. LocalStack is the broker itself: two replicas would be two queue sets with separate state, so a message published to one would never be consumed from the other. Behind a managed SQS that problem belongs to the provider; here the queue is the one dependency with a single process, and the readiness probe reports it when it is gone. `mongo` is a read model: the audit timeline and the journey are append-only observations, the API never reads a balance from them, and the financial path keeps working while the store is down. `redis` is an accelerator, not a source of truth: the cached readers fall through to PostgreSQL on any cache failure, so a single replica is plenty and a restart only clears a cache that rebuilds itself.

## Database

`postgres-primary` runs the official image with `wal_level=replica` and `max_wal_senders=10`. The init hook creates the `replicator` role from `REPLICATION_PASSWORD` and appends the `host replication` line to `pg_hba.conf`, because the default rule for `all` does not cover a replication connection.

`postgres-replica` runs the same image. An init container waits for the primary and runs `pg_basebackup -R` into its own volume when `PGDATA` holds no cluster. The `-R` flag writes `standby.signal` and the connection settings, so the main container starts in recovery and follows the primary.

The two instances answer on separate headless services: `postgres-primary:5432` and `postgres-replica:5432`. The API reads `DATABASE_URL`, which points at the primary. The replica is the recovery target: it carries every committed transaction and can be promoted by hand. Replication is asynchronous, and the delivery does not claim a zero-loss failover. Both statefulsets carry `app.kubernetes.io/component: database` and a spread rule over `kubernetes.io/hostname`, so the standby is scheduled on a node that does not already hold a database pod.

## API

The deployment runs the image built from the root `Dockerfile`:

- `startupProbe` on `/health/live`, 30 attempts of 3 seconds, so a slow boot does not restart the process;
- `livenessProbe` on `/health/live`, and `readinessProbe` on `/health/ready`, which asks PostgreSQL and SQS together;
- `topologySpreadConstraints` on `kubernetes.io/hostname`, so one node does not carry both replicas when the scheduler has a choice;
- `PodDisruptionBudget` with `minAvailable: 1`, so a drain moves one pod at a time;
- `rollingUpdate` with `maxUnavailable: 0` and `maxSurge: 1`, so a new pod becomes ready before an old one leaves;
- a container without privilege escalation, with every capability dropped, with a read-only root filesystem except `/tmp`, and with `seccompProfile: RuntimeDefault`;
- requests and limits small enough for a laptop.

Two replicas are not decoration. The outbox publisher claims rows with `FOR UPDATE SKIP LOCKED`, the retry writer locks the wager and the wallet, and the consumer deduplicates on the inbox row. Both replicas do that work at the same time, and the financial result stays single.

`api` is the `ClusterIP` service on port `80`, and `api-headless` publishes the pod addresses for Prometheus. The `local` overlay turns the first into a `NodePort` on `30080`. That service is the load balancer: both replicas register in its endpoints, and kube-proxy spreads connections across them. The balance is at layer 4, per connection, so a client that keeps one connection open stays on one pod and a loop of separate requests alternates; the statement's concurrency scenario is what spreads load in practice.

## Migration

`migrate` is a Job with the same image and the same environment. The cluster script deletes the previous Job, applies the tree, and waits for `condition=complete` before it reports success. The API tolerates the window between its start and the migration: the process boots, readiness waits on the database and the queue, and a request that arrives before the tables exist fails as a `503` the provider may retry.

No migration runs at boot, in compose or here.

## LocalStack

The deployment mounts a ConfigMap generated from `docker/localstack/01-queues.sh` at `/etc/localstack/init/ready.d`, so the four FIFO queues come from the one script the compose file already uses. The API reaches it at `http://localstack:4566`.

## Mongo

`mongo` runs the same `mongo:7` image as compose and answers on the `mongo` Service at `mongodb://mongo:27017/fortune_tiger_audit`. The API ConfigMap carries `MONGODB_URL`, so both API replicas write the audit timeline and the journey store to the one database. Mongo is a read model, not a financial dependency: the acquisition is lazy, an unreachable store never blocks the boot or a transaction, and it stays out of `/health/ready`. `cluster:verify` proves the datalake by listing `audit_events` and `journey_steps` after the financial flow, so a manifest that forgets the store fails the job. The write is asynchronous — a wager is committed in Postgres, then its events leave through the outbox and are consumed with a long poll of up to twenty seconds before they reach Mongo — so the datalake check gives that pipeline a budget (`datalakeRetries`, forty seconds) instead of assuming the collections exist the instant the financial flow returns, which keeps the job green on a slow machine or under a busy consumer.

## Redis

`redis` runs the same `redis:7-alpine` image as compose and answers on the `redis` Service at `redis://redis:6379`. The API ConfigMap carries `REDIS_URL`, so both API replicas share the one cache.

Redis is an accelerator, never a source of truth: the cached readers wrap the SQL wallet and wager readers and fall through to the database on any Redis error, so a cache outage changes no answer a provider receives. That is also why it stays out of `/health/ready` — the metric is the tell. `cluster:verify` proves the cache by reading the same wallet twice and asserting the `cache_hits_total` counter moved across the pods, so a manifest that forgets Redis fails the job exactly as one that forgets Mongo does. The cache is ephemeral by nature, so the pod uses no persistent volume: a restart clears it and the readers warm it again from the database.

## Observability

`overlays/observability` adds Prometheus, Grafana, and Alertmanager to the `local` overlay.

Prometheus scrapes through a DNS service discovery on `api-headless`, so each scrape reaches every pod address instead of the one pod a `ClusterIP` would pick. The scrape keeps the `fortune-tiger` job name, and the Grafana datasource and dashboard are the files under `docker/grafana`, mounted from generated ConfigMaps. Nothing is copied, so the panel and the compose profile cannot drift.

The alert rules under `docker/alerting/rules` and the `alertmanager.yml` under `docker/alerting` are mounted the same way, from the `prometheus-rules` and `alertmanager-config` ConfigMaps. Prometheus evaluates the rules with the `fortune-tiger` job, and `alerting.alertmanagers` points at the `alertmanager` Service. Alertmanager routes every alert to the `email` receiver addressed to `darkfrontcode@gmail.com`; the SMTP password mounts from the `alertmanager-smtp` Secret, so a rule that fires reaches the mailbox once the operator fills the credential.

## Commands

| Command | What it does |
| --- | --- |
| `bun run cluster:up` | builds the image, creates the cluster, loads the image, applies the tree, runs the migration, waits for both replicas, and checks `/health/ready` on `30080` |
| `bun run cluster:down` | deletes the cluster |
| `bun run cluster:status` | nodes, pods, services, endpoints, and the readiness body |
| `bun run cluster:verify` | nodes `Ready`, two API endpoints, the standby `streaming`, the migration complete, the financial flow, the `audit_events` and `journey_steps` collections in Mongo, the Redis cache hit counter, and both replicas serving; exits non-zero on the first failing check |
| `bun run cluster:render` | renders every overlay with `kubectl kustomize` and needs no cluster |

`cluster:up` needs Docker only. `kind` and `kubectl` are resolved from `PATH`; when one is missing, the script downloads the pinned release (`kind` 0.33, `kubectl` 1.32) into `.tools/bin` and uses that binary, so a machine with Docker and Bun runs the command without a manual install. On Windows it starts Docker Desktop when the engine is not answering, and it starts the cluster containers again when they are stopped, so a run after a Docker restart converges without a recreate. `cluster:render` needs only `kubectl`, so the pipeline checks the manifests without a cluster. The script reads no environment variable: the cluster name, the namespace, the overlay, and the image tag are constants in the file.

The render of a ConfigMap that points at `docker/` runs with `LoadRestrictionsNone`, because Kustomize refuses a file above the kustomization root by default. The script always passes the flag, so the reader never types it.

## Verification

`cluster:verify` reads the cluster and refuses to guess. It checks, in this order:

- three nodes are `Ready`;
- the `api` Service has at least two endpoints;
- `pg_stat_replication` on the primary answers `streaming`;
- the `migrate` Job reports one success;
- a wallet opens, a `BET` debits it, the same request replays with the same transaction and the original balance, the ledger holds one entry per balance change, and reconciliation answers `consistent: true`;
- the Mongo pod answers and the audit and journey collections exist there;
- the same wallet read twice answers twice and the `cache_hits_total` counter moved, which is the Redis cache working;
- after a burst of independent requests, both API pods show a higher `wager_transactions_processed_total`, which is the load balancer working.

Every check prints a line with `✅` or `❌` and the measured value, and any failure exits `1`. The command needs `kubectl` only.

## Continuous integration

The `CI` workflow carries two jobs. `test` runs lint, the type-check, the unit suite, the coverage gate, and the three server suites against PostgreSQL and LocalStack service containers. `cluster` runs `bun run cluster:up` and then `bun run cluster:verify` on an `ubuntu-latest` runner, so every push to `main` or `staging` and every pull request raises the real cluster and proves the manifests, the migration, the replica, and the financial path.

The job installs Bun and nothing else: the runner has Docker, and the script downloads `kind` and `kubectl` into `.tools/bin` exactly as it does on a workstation. A failing job prints the nodes, the pods, and the last events before it ends.

## What the cluster proves

- two API processes answer behind one service, and a repeated wager still returns one debit;
- a process that dies mid-flight leaves the work to the other replica, which the publisher and the consumer already guarantee with row locks and the inbox;
- a wallet, its ledger, and its outbox row commit on the primary and replicate to the standby;
- the audit timeline and the journey store live in Mongo, next to the financial path without joining it;
- Redis backs the wallet and wager reads, and the cache counter proves it without asserting a claim about latency;
- readiness turns `503` when PostgreSQL or SQS is gone, and the pod leaves the service before it takes traffic — a Mongo or Redis outage does not.

## Limits

- The cluster runs on one machine. Three nodes share one kernel and one disk.
- No ingress and no TLS. The API is on a node port, and the provider identity stays `anonymous`.
- No operator and no automatic failover. Promoting the standby is a manual step, and replication lag means an asynchronous standby can lose the last fraction of a second.
- No autoscaler. A horizontal pod autoscaler needs `metrics-server`, and the load in this delivery has no target to scale against.
- The secrets in `config/` are local demo values. A real deployment reads them from a secret store, and the manifests do not carry one.
- `kind` is a development tool. A production cluster would keep the manifests and replace the distribution.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
