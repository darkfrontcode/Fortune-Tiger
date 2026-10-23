# 0002. Keep four layers with ports and adapters

- Status: Accepted
- Date: 2026-10-23

## Context

The domain has to stay readable while the delivery grows: HTTP, SQS, PostgreSQL, Prometheus, and an optional identity provider. Mixing a rule with a transport makes the rule hard to find and hard to test, and it couples a business decision to a library.

The alternative was a Nest module tree organised by feature, with controllers calling repositories directly. It is faster to start and becomes a thicket once retries, idempotency, and reconciliation arrive.

## Decision

`src` holds exactly four folders and two files.

- `domain`: the concepts, their guards, their patterns, and their error text. No Nest decorator, no I/O, no import of `application`.
- `application`: the use cases and the ports they consume. A port is a protocol beside the capability and a `Symbol` token in the owning module.
- `infrastructure`: the adapters that satisfy those ports, plus the Nest modules that bind them with `useExisting`.
- `presentation`: HTTP, DTOs, mappers, filters, the auth guard, and the health routes.

Dependencies point inward. A cross-layer import uses the alias `@domain/*`, `@application/*`, `@infrastructure/*`, or `@presentation/*`. A module that needs a provider imports the module that owns it; that import is the only place where the arrow points outward.

`src/main.ts` boots Nest and `src/app.module.ts` wires only what spans layers: the reference worker and the runtime service.

## Consequences

- A rule is tested without a database, a queue, or a container.
- A transport can be replaced without touching the domain. The SQS consumer is one adapter behind `SubmitWagerUseCase`; the HTTP route is another.
- The structure costs indirection. A reader follows a token from the use case to the module that binds it, and that detour is deliberate.
- A folder without a `spec.md` is not implemented, so the boundary is documented where it lives.
