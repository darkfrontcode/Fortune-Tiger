# 0010. Run the delivery on a local Kubernetes cluster

- Status: Accepted
- Date: 2026-10-24

## Context

The delivery proves correctness on one process and, in the concurrency suite, on six short-lived processes on one host. Both are honest about the rules and quiet about the shape of a deployment: nothing in the repository shows how the API, PostgreSQL, and the queue are wired when they are separate workloads with their own lifecycle.

An evaluator who wants to see two API replicas behind one address, a database with a standby, and a probe that pulls a pod out of rotation has to assemble that from scratch.

## Decision

The repository carries a real cluster definition, and `kind` provides the cluster.

- `kind` runs every node as a Docker container, so the cluster needs no virtual machine and starts from the same Docker daemon compose already uses. `minikube` offers more features and `k3d` starts faster; neither keeps the whole cluster inside Docker as directly.
- The tree is Kustomize, not Helm. `kubectl` ships Kustomize, so the delivery adds no second package manager, and the two overlays stay shorter than the chart that would wrap them.
- Three nodes: one control plane and two workers, so the two API replicas land on different machines and the spread rule has somewhere to go.
- Two PostgreSQL instances: one primary and one streaming standby, built from the official image with `pg_basebackup -R`. The API reads `DATABASE_URL`, which points at the primary. A standby that lags cannot serve a financial read, and the delivery does not pretend otherwise.
- Two API replicas, and the guarantees that make them safe are the ones already tested: `FOR UPDATE SKIP LOCKED` on the outbox, a row lock on the wallet and the wager, and the inbox row.
- Migrations stay a Job. The app still never migrates at boot.
- `scripts/cluster.ts` is the single entry. It builds the image, loads it into the nodes, renders with `kubectl kustomize`, pipes the result to `kubectl apply`, waits for the migration, and checks readiness.

## Consequences

- An evaluator sees five pods, three nodes, and two database instances in one command.
- The image is the same artifact compose builds, so the two paths cannot drift.
- The LocalStack queue script stays in `docker/localstack`, mounted by both paths. Kustomize refuses a file above its root, so the render runs with `LoadRestrictionsNone`, and the script owns that flag.
- A `readOnlyRootFilesystem` needs a writable `$HOME` for the Bun runtime, which the Deployment mounts as an `emptyDir` beside `/tmp`.
- The cluster is one machine. It proves placement, probes, rolling updates, and a standby; it does not prove a network partition or a real failover.
- No autoscaler. A horizontal pod autoscaler needs `metrics-server`, and this delivery has no target to scale against.
- The manifests carry demo secrets. A real deployment reads them from a secret store, and this repository does not ship one.
