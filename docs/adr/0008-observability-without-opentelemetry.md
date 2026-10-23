# 0008. Observe with structured logs and Prometheus

- Status: Accepted
- Date: 2026-10-23

## Context

The system has to answer two operational questions: did a transaction fail, and is the outbox falling behind? A dashboard nobody opens is not an answer, and a tracing stack adds a collector, an exporter, and a backend for a service that runs on one machine.

The statement makes OpenTelemetry optional.

## Decision

Logs and metrics are explicit ports in `application/observability`, with adapters in `infrastructure/observability`.

- `LoggerProtocol` writes one line per event. JSON by default, `key=value` under `LOG_PRETTY`. `child` attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. An amount and a wager body never enter a line.
- `MetricProtocol` carries counters and observations. `PrometheusMetric` is the default and answers `GET /metrics` with the Prometheus text exposition; `SimpleMetric` serves tests and `METRICS_BACKEND=memory`.
- The names live in `application/observability/data`, so no adapter invents one. The families are transactions by status, duplicates, retries, dead letters, lock conflicts, outbox lag, and processing latency.
- `GET /health/live` reads the process, and `GET /health/ready` asks PostgreSQL and SQS at the same time with a two-second abort, so a dead dependency answers `503` instead of hanging.

OpenTelemetry stays out. A trace would help a distributed deployment; this delivery runs one process and one database, and the correlation id already stitches the lines of one transaction.

## Consequences

- A transaction is traceable by `correlationId` across the log, the outbox row, and the queue message.
- The metric names are stable and documented in one place.
- A dashboard and an alert set are out of scope; the exposition is the contract, and Grafana can read it without a code change.
- No distributed tracing means a cross-service latency question is answered by timestamps, not by spans.
