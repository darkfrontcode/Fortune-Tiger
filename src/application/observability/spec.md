# Observability

This application capability owns the logger and metric contracts, their injection tokens, and the stable metric names. Infrastructure provides the adapters. It does not own logging or metric implementations.

`data/metric-names.data.ts` holds `metricNames`, one key per name. `maps/metric-description.map.ts` holds `MetricDescriptionMap`, a class that extends `Map`, with the help text of each name. The key is a name from `data`, so the table and the call sites read the same `const`.

| Key | Name | Kind |
| --- | --- | --- |
| `transactionPending` | `wager_transactions_pending_total` | counter |
| `transactionPendingReference` | `wager_transactions_pending_reference_total` | counter |
| `transactionProcessed` | `wager_transactions_processed_total` | counter |
| `transactionRejected` | `wager_transactions_rejected_total` | counter |
| `transactionFailed` | `wager_transactions_failed_total` | counter |
| `duplicate` | `idempotency_duplicates_total` | counter |
| `consumerRetry` | `consumer_retries_total` | counter |
| `consumerDeadLetter` | `consumer_dead_letters_total` | counter |
| `lockConflict` | `lock_conflicts_total` | counter |
| `reconciliationDivergence` | `reconciliation_divergence` | counter |
| `outboxLag` | `outbox_lag_milliseconds` | observation |
| `transactionLatency` | `wager_processing_milliseconds` | observation |
| `cacheHit` | `cache_hits_total` | counter |
| `cacheMiss` | `cache_misses_total` | counter |

The wager use case counts the transaction by its final status, counts a replay, and observes the processing duration. The SQS consumer counts a retry and a dead letter. The persistence writer counts a lock conflict. The outbox publisher observes the age of the row it publishes. The reconciliation use case counts a divergence.

`METRICS_BACKEND` chooses the adapter: `memory` keeps `SimpleMetric`, and the default `prometheus` builds `PrometheusMetric`. `GET /metrics` renders whichever one the container holds.

OpenTelemetry and a dashboard stay out.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
