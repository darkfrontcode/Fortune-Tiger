# 0013. Alert with Alertmanager to email

- Status: Accepted
- Date: 2026-10-25

## Context

The observability answer explains what broke but not when to care. The operator asked for a page: when the API is down, the process memory is high, a dead letter arrives, the outbox lags, the audit or the journey store fails, or a reconciliation diverges, someone should know. The mailbox is `darkfrontcode@gmail.com`.

The statement makes alerting a scoring item in section 14 and leaves the load test out of it.

## Decision

Prometheus raises the alerts and Alertmanager delivers them by email.

- `docker/alerting/rules/fortune-tiger.rules.yml` is the alert set: 8 rules that fire on the API being down, high memory, a dead letter, a retry storm, outbox lag, audit store failure, journey store failure, and reconciliation divergence. Each rule reads a real metric, so a rule cannot fire on a number no adapter produces.
- `docker/alerting/alertmanager.yml` routes every alert to the `email` receiver addressed to `darkfrontcode@gmail.com`. The SMTP password reads from `smtp_auth_password_file`, mounted from `docker/alerting/smtp-password` in compose and from the `alertmanager-smtp` Secret in the cluster, so no credential enters the repository. Alertmanager does not interpolate environment variables into its config, so the password arrives as a mounted file instead of a `$VAR` placeholder.
- `PrometheusMetric` also registers the default process metrics through `collectDefaultMetrics`, so `process_resident_memory_bytes` answers the memory question the alert set asks. The names are library-provided, not invented by the adapter.
- Compose runs `alertmanager` under the `observability` profile; the Kubernetes observability overlay runs it as a Deployment behind a `NodePort` on `30093`, next to Prometheus on `30090` and Grafana on `30030`. `docker/alerting` is the single source for the compose mounts and the ConfigMaps.
- Email is the receiver this delivery ships. PagerDuty and Slack would each be one more block in the `alertmanager.yml`, on the same alert stream.

## Consequences

- An operator gets an email before a metric curve makes the problem obvious.
- The alert set is only as good as the metric names it reads, and both live with the app, so renaming a metric must touch the rule or the alert silently dies.
- Real email needs a Gmail App Password; until the operator sets it, Alertmanager runs and logs delivery failures, keeping the pipeline visible.
- A divergence alert tells an operator a wallet needs reconciliation, not how to repair it; repair stays manual by design.
