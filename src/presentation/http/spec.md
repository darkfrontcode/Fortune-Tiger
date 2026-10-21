# HTTP

Delivery is at-least-once. The system stays correct under duplicates, out-of-order delivery, multiple instances, and a process dying mid-flight.

Global invariants: do not double-credit, do not double-debit, do not lose a committed event, do not allow a negative balance.

## Wallet

- `POST /wallets` — `playerId` and `initialBalance`. An initial balance above zero creates `OPENING` and `CREDIT` in the same SQL transaction. A duplicate `playerId` + `currency` is a conflict. The body returns `id`, `playerId`, `balance`, and `version`.
- `GET /wallets/:walletId`
- `GET /wallets/:walletId/ledger?cursor=&limit=50` — opaque, stable cursor
- `POST /wallets/:walletId/reconciliation` — see `src/application/reconciliations/spec.md`

## Wager

- `POST /wagering/transactions` with a required `Idempotency-Key` header. The body returns `transactionId`, `status`, `balance`, and `idempotentReplay`.
- `GET /wagering/transactions/:transactionId`
- `GET /providers/:providerId/wagering/transactions/:externalTransactionId`

`OPENING` is not accepted.

## Status

Decision. Stable across every endpoint.

| Situation | HTTP |
| --- | --- |
| Invalid payload | 400 |
| Idempotency key with a different payload, or a duplicate wallet | 409 |
| Business rule, `failureCode` in the body | 422 |
| `PENDING` or `PENDING_REFERENCE` | 202 |
| Transient infrastructure failure | 503 |
| `PROCESSED`, replay (`idempotentReplay: true`), and an already terminal `REJECTED` | 200 |

## Auth

Decision: no identity provider. A no-op `AuthGuard` and a `ProviderIdentityProtocol` in `identity.protocol.ts`. Health stays open. The queue is an internal channel. Provider identity inside a message still goes through domain rules.

Keycloak is out.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
