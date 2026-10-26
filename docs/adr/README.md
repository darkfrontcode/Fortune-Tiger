# Architecture decision records

An ADR records one decision, the context that forced it, and what it costs. The format is short on purpose: status, date, context, decision, consequences. A decision that changes gets a new record; the old one keeps its number and its history.

| ADR | Decision |
| --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record the architecture decisions |
| [0002](0002-four-layers-with-ports.md) | Keep four layers with ports and adapters |
| [0003](0003-postgresql-with-mikro-orm.md) | Use PostgreSQL with MikroORM and pessimistic locking |
| [0004](0004-rich-domain-model.md) | Model money, wallet, ledger, and wager as a rich domain |
| [0005](0005-at-least-once-with-inbox-and-outbox.md) | Deliver at least once with a transactional inbox and outbox |
| [0006](0006-idempotency-as-stored-fact.md) | Make idempotency a stored fact |
| [0007](0007-two-authentication-modes.md) | Offer two authentication modes and keep Keycloak optional |
| [0008](0008-observability-without-opentelemetry.md) | Observe with structured logs and Prometheus |
| [0009](0009-separate-inbound-and-outbound-queues.md) | Separate inbound commands from outbound events |
| [0010](0010-local-kubernetes-with-kind.md) | Run the delivery on a local Kubernetes cluster |
| [0011](0011-polyglot-audit-store-with-mongodb.md) | Keep the audit timeline in MongoDB |
| [0012](0012-journey-read-model-in-mongodb.md) | Keep the journey read model in MongoDB |
| [0013](0013-alerting-with-alertmanager-and-email.md) | Alert with Alertmanager to email |
| [0014](0014-mcp-semantic-search-in-mongodb.md) | Search events semantically through MCP over MongoDB Vector Search |
| [0015](0015-redis-cache.md) | Cache wallet and wager reads in Redis |

A reader who wants the rules rather than the reasoning reads [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the `spec.md` beside each folder.
