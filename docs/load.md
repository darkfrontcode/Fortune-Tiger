# Load

`bun run test:load` measures the HTTP path under concurrency and proves the financial effect stayed correct. It is a measurement, not a gate: there is no RPS target, and it is not part of CI.

## Environment

| Item | Value |
| --- | --- |
| Date | 2026-10-22 |
| Host | Windows 11 Home, 12th Gen Intel Core i5-12500H, 8 GB RAM |
| Runtime | Bun 1.4.3, one API process |
| Client | `scripts/load.ts`, same host, separate process |
| Database | `postgres:16` in Docker 27.2.0, Compose |
| Queue | `localstack/localstack:3`, FIFO queues from `docker/localstack` |
| API mode | `AUTH_MODE=anonymous`, `METRICS_BACKEND=prometheus` |

Client, API, PostgreSQL, and LocalStack share one machine. The API also runs its outbox publisher, reference worker, and queue consumer during the run, as it does in production.

## Method

1. Start the stack and the API (`docker compose up -d`, `bun run migration:up`, `bun run start`).
2. Run `bun run test:load`. The script probes `GET /health/live`, opens the wallets, and then measures two waves with `--concurrency` requests in flight (default `25`).
3. **Distinct wallets** — each bet debits its own wallet, so no request waits on another. This is the ceiling of the HTTP, application, and database path.
4. **Hot wallet** — every bet debits one wallet, so `SELECT FOR UPDATE` serializes the balance update. The difference against the first wave is the cost of the wallet lock.
5. Each duration is measured on the client around the HTTP call. p50, p95, and p99 use the nearest rank; throughput is the request count over the wave wall time. Opening the wallets is setup and stays out of the measurement.
6. After the waves, the script asserts every distinct wallet ended at `9.00`, the hot wallet ended at `1000.00`, the hot wallet reconciliation is consistent with one entry per bet plus the opening, the processed counter grew by the wave sizes, and the duplicate counter did not move.

The default wave is `50` distinct wallets and `50` hot-wallet bets. A larger run uses `--wallets=100 --hot=100 --concurrency=50`.

## Results

Default run, fresh API process:

| Wave | Requests | Throughput | p50 | p95 | p99 | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| Distinct wallets | 50 | 43.5 req/s | 495 ms | 762 ms | 764 ms | 0 |
| Hot wallet | 50 | 22.4 req/s | 785 ms | 1325 ms | 1368 ms | 0 |

Larger run, same process:

| Wave | Requests | Throughput | p50 | p95 | p99 | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| Distinct wallets | 100 | 52.7 req/s | 787 ms | 1061 ms | 1132 ms | 0 |
| Hot wallet | 100 | 9.5 req/s | 3918 ms | 6527 ms | 6706 ms | 0 |

Both runs passed every correctness check: 100 % of the bets were `PROCESSED`, every distinct wallet ended at `9.00`, the hot wallet ended at `1000.00`, the reconciliation was consistent with `51` and `101` entries, and `idempotency_duplicates_total` did not move. `lock_conflicts_total` stayed at `0` in both runs.

Sequential requests on the same stack answer in about `21–26 ms` (`--wallets=10 --hot=10 --concurrency=1`), which shows the per-request cost with no queueing.

## Reading the numbers

- **The hot wallet is slower and less stable.** Its balance update is serialized by the row lock, while the distinct wave runs in parallel. That gap is the lock, and it grows with the burst.
- **The environment is the ceiling.** One API process, one PostgreSQL container, and one LocalStack container share the host; the outbox publisher competes for database connections and LocalStack while the waves run. Throughput in the `40–70 req/s` range for distinct wallets is a property of this laptop stack, not of the design.
- **`lock_conflicts_total` is not lock waits.** The counter rises on a lock wait timeout or a deadlock, not on a normal `SELECT FOR UPDATE` wait. A serialized hot wallet legitimately keeps it at zero.
- **Run-to-run variance is large.** Hot-wallet throughput moved between `9` and `22 req/s` and p95 between `0.8 s` and `8 s` across runs on the same machine, mostly from Docker Desktop I/O and a growing outbox backlog. The table is one representative run, not a benchmark contract.
- **The test generates its own outbox load.** Each processed bet records two events, so a long wave leaves a publish backlog. That backlog is real, and the publisher drains it at its own pace; it is part of what the run measures.

## Limits

- No sustained ramp, no think time, and no distributed clients. The numbers answer "is the correct path fast enough to demo", not "how many RPS does production hold".
- No queue-path load: the SQS request path is covered by the integration and concurrency suites, not by this script.
- Nothing is cleaned up. Each run opens new wallets with unique player ids, so repeated runs stay independent and the database keeps the evidence.
- Not in CI, because it needs a running stack and its numbers depend on the machine.
