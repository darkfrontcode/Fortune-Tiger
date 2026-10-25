# API

The HTTP contract of Fortune Tiger. The route rules live in [`src/presentation/http/spec.md`](../src/presentation/http/spec.md); this page is the provider-facing view.

Open [`requests.http`](../requests.http) beside this file, or run `bun run demo` for the same happy path without a client.

The machine-readable contract is checked in at [`docs/api/openapi.json`](api/openapi.json). `bun run openapi:export` rewrites it from the running application, and `bun run openapi:export --check` compares the file with the code; the pipeline runs the check, so the document cannot drift from the routes.

## Conventions

- Base URL: `http://localhost:3000` (`PORT` from `.env`). The queue is an internal channel and has no route.
- Bodies are JSON with `Content-Type: application/json`.
- `X-Provider-Id` carries the caller identity in the default `anonymous` auth mode. Without the header, the `providerId` of the body answers for it, so the caller is trusted.
- `Authorization: Bearer <token>` is required in the `jwt` auth mode (`AUTH_MODE=jwt`). The provider comes from the `provider_id` claim of the token; see [Auth](#auth).
- `Idempotency-Key` is required on `POST /wagering/transactions`. The recommended shape is `{providerId}:{externalTransactionId}`.
- Money is `{ "amount": "10.00", "currency": "BRL" }`. `amount` is a decimal string with exactly two places; `currency` is an uppercase ISO-4217 code.
- Identifiers are UUIDv7. Ledger pages order by identifier, so the order is the insertion order.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/wallets` | open a wallet, with an optional opening balance |
| `GET` | `/wallets/:walletId` | read the wallet |
| `GET` | `/wallets/:walletId/ledger?cursor=&limit=50` | page through the ledger entries |
| `POST` | `/wallets/:walletId/reconciliation` | compare the wallet with its ledger |
| `POST` | `/wagering/transactions` | submit a wager |
| `GET` | `/wagering/transactions/:transactionId` | read a wager |
| `GET` | `/wagering/transactions/:transactionId/audit?eventType=&from=&to=&limit=50` | read the audit timeline of a wager |
| `GET` | `/wagering/transactions/:transactionId/journey?stage=&outcome=&from=&to=&limit=50` | read the journey stages of a wager |
| `GET` | `/providers/:providerId/players/:playerId/journey?stage=&outcome=&from=&to=&limit=50` | read the journey of a player |
| `GET` | `/providers/:providerId/wagering/transactions/:externalTransactionId` | read a wager by provider pair |
| `GET` | `/health/live` | the process is up |
| `GET` | `/health/ready` | PostgreSQL and SQS answer |
| `GET` | `/metrics` | Prometheus text exposition |
| `GET` | `/docs` | the Swagger UI over this contract |
| `GET` | `/docs-json` | the same document as OpenAPI 3 JSON |

## Documentation

```http
GET /docs
GET /docs-json
```

`/docs` serves the Swagger UI, and `/docs-json` answers the OpenAPI 3 document behind it. Both stay open, like health and metrics.

The document covers the provider routes only: health and metrics stay out of it. The request DTOs carry the field rules and an example, and each route shows its response body, the `Idempotency-Key` header on `POST /wagering/transactions`, the `X-Provider-Id` header of the `anonymous` mode, and the statuses of the table below. The `bearer` scheme is registered for the `jwt` mode; the default mode asks for no token.

## Status

Stable across every endpoint.

| Situation | HTTP |
| --- | --- |
| Invalid payload | `400` |
| Missing resource | `404` |
| Idempotency key with a different payload, or a duplicate wallet | `409` |
| Business rule, `failureCode` in the body | `422` |
| `PENDING` or `PENDING_REFERENCE` | `202` |
| Transient infrastructure failure, or a `FAILED` wager | `503` |
| `PROCESSED`, replay with `idempotentReplay: true`, and an already terminal `REJECTED` | `200` |
| Wallet created | `201` |

A replay answers `200` even when the stored wager is `REJECTED`: the body is the original result, and `idempotentReplay` is `true`.

## Wallet

### Open a wallet

```http
POST /wallets
```

```json
{
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "initialBalance": { "amount": "100.00", "currency": "BRL" }
}
```

`201`:

```json
{
  "id": "01a1665d-4713-7b01-8ac6-c868e696abab",
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "balance": { "amount": "100.00", "currency": "BRL" },
  "version": 2
}
```

An initial balance above zero writes the internal `OPENING` transaction and its `CREDIT` ledger entry in the same SQL transaction as the wallet. `version` counts balance changes, so the opening credit moves it from `1` to `2`. A duplicate `playerId` plus `currency` answers `409` with `{ "message": "A wallet already exists for this player and currency." }`.

### Read a wallet

```http
GET /wallets/:walletId
```

`200` with `id`, `playerId`, `balance`, and `version`. An absent wallet answers `404` with `"Wallet not found."`.

### Page the ledger

```http
GET /wallets/:walletId/ledger?limit=50
```

```json
{
  "items": [
    {
      "id": "01a1665d-4764-7f82-a626-7bdb6d5201b4",
      "transactionId": "01a1665d-4762-7e04-8271-4f705d6bc677",
      "direction": "CREDIT",
      "amount": { "amount": "100.00", "currency": "BRL" },
      "balanceBefore": { "amount": "0.00", "currency": "BRL" },
      "balanceAfter": { "amount": "100.00", "currency": "BRL" },
      "createdAt": "2026-10-23T01:25:51.506Z"
    }
  ]
}
```

- `limit` defaults to `50` and stays between `1` and `100`.
- `cursor` is the base64url of the last `id` of the previous page. The next page starts after it.
- `nextCursor` is absent on the last page.
- An invalid `cursor` or `limit` answers `400` with `"Invalid ledger query."`.
- An absent wallet answers `404`.

### Reconcile

```http
POST /wallets/:walletId/reconciliation
```

`200`:

```json
{
  "walletId": "01a1665d-4713-7b01-8ac6-c868e696abab",
  "storedBalance": { "amount": "70.00", "currency": "BRL" },
  "calculatedBalance": { "amount": "70.00", "currency": "BRL" },
  "difference": { "amount": "0.00", "currency": "BRL" },
  "consistent": true,
  "checkedEntries": 2
}
```

The route compares and reports; it never repairs. A divergence is logged and counted in `reconciliation_divergence`. An absent wallet answers `404` with `{ "walletId": "...", "failureCode": "WALLET_NOT_FOUND" }`.

## Wager

```http
POST /wagering/transactions
Idempotency-Key: provider-a:transaction-bet-1
```

```json
{
  "providerId": "provider-a",
  "externalTransactionId": "transaction-bet-1",
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "walletId": "01a1665d-4713-7b01-8ac6-c868e696abab",
  "roundId": "round-1",
  "gameId": "fortune-tiger",
  "kind": "BET",
  "money": { "amount": "30.00", "currency": "BRL" }
}
```

`200`:

```json
{
  "transactionId": "01a1665d-47ff-7d2e-915c-c764badf3399",
  "status": "PROCESSED",
  "balance": { "amount": "70.00", "currency": "BRL" },
  "idempotentReplay": false
}
```

`balance` is the wallet balance when the transaction finished. A business rejection answers `422` with the same shape plus `failureCode`, for example `REJECTED` and `INSUFFICIENT_FUNDS`.

### Kinds

| Kind | Balance | Ledger | Rule |
| --- | --- | --- | --- |
| `BET` | debit | `DEBIT` | insufficient balance rejects with `INSUFFICIENT_FUNDS` |
| `WIN` | credit | `CREDIT` | a `BET` reference in the same round is optional |
| `LOSS` | unchanged | none | records the processed event only |
| `REFUND` | credit | `CREDIT` | one processed `BET`, once, same amount, same round |
| `ROLLBACK` | inverse | one inverted entry | one processed `BET`, `WIN`, or `REFUND`, once |
| `OPENING` | internal | `CREDIT` | written when a wallet opens with a balance above zero; rejected here with `OPENING_NOT_ALLOWED` |

`REFUND` and `ROLLBACK` require `referenceExternalTransactionId`, pointing at a transaction of the same provider, player, wallet, currency, and round. `REFUND` points only at `BET`; `ROLLBACK` points at `BET`, `WIN`, or `REFUND`. A reference that has not arrived yet answers `202` with `PENDING_REFERENCE`, and the retry worker keeps checking it.

### Idempotency

- The header is the source of truth. A request without it answers `400` with `"The Idempotency-Key header is required."`.
- The hash covers the business fields only: `providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `money`, and `referenceExternalTransactionId` when present. The header and transport metadata stay out.
- Same key and same payload: the original result, the balance observed at that processing, and `idempotentReplay: true`.
- Same key and a different payload: `409` with `failureCode: IDEMPOTENCY_PAYLOAD_CONFLICT`. That is not a replay.
- Uniqueness holds in PostgreSQL on `idempotency_key` and on `(provider_id, external_transaction_id)`.

### Failure codes

`INSUFFICIENT_FUNDS`, `REVERSAL_INSUFFICIENT_FUNDS`, `CURRENCY_MISMATCH`, `WALLET_NOT_FOUND`, `PLAYER_WALLET_MISMATCH`, `INVALID_KIND`, `INVALID_REFERENCE_KIND`, `REFERENCE_NOT_FOUND`, `REFERENCE_ALREADY_REVERSED`, `REFERENCE_AMOUNT_MISMATCH`, `REFERENCE_SCOPE_MISMATCH`, `IDEMPOTENCY_PAYLOAD_CONFLICT`, `OPENING_NOT_ALLOWED`, `NEGATIVE_AMOUNT`, `INVALID_MONEY`.

`REJECTED` is a business violation. `FAILED` is a permanent infrastructure error and answers `503`; the provider may resend.

### Read a wager

```http
GET /wagering/transactions/:transactionId
GET /providers/:providerId/wagering/transactions/:externalTransactionId
```

`200`:

```json
{
  "transactionId": "01a1665d-47ff-7d2e-915c-c764badf3399",
  "providerId": "provider-a",
  "externalTransactionId": "transaction-bet-1",
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "walletId": "01a1665d-4713-7b01-8ac6-c868e696abab",
  "roundId": "round-1",
  "gameId": "fortune-tiger",
  "kind": "BET",
  "status": "PROCESSED",
  "money": { "amount": "30.00", "currency": "BRL" },
  "createdAt": "2026-10-23T01:25:51.743Z"
}
```

An absent wager answers `404` with `"Wager transaction not found."`.

### Read the audit timeline

```http
GET /wagering/transactions/:transactionId/audit?eventType=&from=&to=&limit=50
X-Provider-Id: provider-a
```

`200`:

```json
{
  "items": [
    {
      "eventId": "01a1665d-47ff-7d2e-915c-c764badf3400",
      "eventType": "WagerTransactionProcessed",
      "eventVersion": 1,
      "occurredAt": "2026-10-23T01:25:51.743Z",
      "recordedAt": "2026-10-23T01:25:52.004Z",
      "wagerId": "01a1665d-47ff-7d2e-915c-c764badf3399",
      "correlationId": "provider-a:transaction-bet-1",
      "source": "fortune-tiger",
      "actor": { "type": "provider", "id": "provider-a" },
      "metadata": { "status": "PROCESSED", "kind": "BET" }
    }
  ]
}
```

The timeline is an append-only read model in MongoDB, fed by the same integration events the outbox publishes. It is **eventually consistent**: an event can take a moment to appear after the wager commits.

- `eventType` filters one event type; `from` and `to` are ISO-8601 bounds on `occurredAt`, both inclusive.
- `limit` defaults to `50` and stays between `1` and `100`.
- Items order by `occurredAt`, then by `eventId` as a deterministic tie-break.
- An invalid filter answers `400` with `"Invalid audit query."`.
- A wager of another provider answers `404`, like an absent wager.
- Only `status`, `kind`, and `direction` enter `metadata`; amounts, balances, and personal data stay out.
- MongoDB is not part of `/health/ready`; a wager is never rolled back because the audit write failed.

### Read the journey of a wager

```http
GET /wagering/transactions/:transactionId/journey?stage=&outcome=&from=&to=&limit=50
X-Provider-Id: provider-a
```

`200`:

```json
{
  "items": [
    {
      "stepId": "01a16667-1d4c-7d2e-915c-c764badf0001",
      "flowId": "provider-a:transaction-bet-1",
      "stage": "ROUTE",
      "operation": "POST /wagering/transactions",
      "outcome": "SUCCEEDED",
      "occurredAt": "2026-10-23T01:25:51.700Z",
      "durationMs": 12,
      "providerId": "provider-a",
      "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
      "wagerId": "01a1665d-47ff-7d2e-915c-c764badf3399",
      "walletId": "01a1665d-4713-7b01-8ac6-c868e696abab",
      "failureCode": null
    }
  ]
}
```

A journey is what one request did, stage by stage: it entered the route (`ROUTE`), reached the use case (`USE_CASE`), wrote the database or rolled back (`DATABASE` with outcome `SUCCEEDED` or `ROLLBACK`), and handed the event to the queue (`QUEUE`). It is a read model in MongoDB, **eventually consistent**, and it never joins the financial SQL transaction.

- `stage` is one of `ROUTE`, `USE_CASE`, `DATABASE`, `QUEUE`; `outcome` is one of `SUCCEEDED`, `FAILED`, `ROLLBACK`.
- `from` and `to` are ISO-8601 bounds on `occurredAt`, both inclusive; `limit` defaults to `50` and stays between `1` and `100`.
- Items order by `occurredAt`, then by `stepId` as a deterministic tie-break.
- An invalid filter answers `400` with `"Invalid journey query."`.
- A wager of another provider answers `404`, like an absent wager.
- A step never carries an amount, a balance, a token, or a header. `failureCode` is the domain code the wager already exposes.

### Read the journey of a player

```http
GET /providers/:providerId/players/:playerId/journey?stage=&outcome=&from=&to=&limit=50
X-Provider-Id: provider-a
```

`200` with the same `{ "items": [...] }` shape, filtered to one caller across requests. Only the caller provider may read its own players: a `providerId` that does not match the caller answers `404` with `"Journey not found."`. A player with no recorded steps answers `200` with an empty page.

## Errors

| Body | When |
| --- | --- |
| `{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }` | a DTO field fails validation |
| `{ "statusCode": 400, "message": "...", "error": "Bad Request" }` | a cross-field rule fails, such as a reversal without a reference, or an invalid ledger, audit, or journey query |
| `{ "message": "A valid bearer token is required." }` | the `jwt` auth mode received a missing or invalid token, `401` |
| `{ "message": "A wallet already exists for this player and currency." }` | duplicate wallet, `409` |
| `"Wallet not found."`, `"Wager transaction not found."`, and `"Journey not found."` | `404` |
| `{ "walletId": "...", "failureCode": "WALLET_NOT_FOUND" }` | reconciliation of an absent wallet, `404` |
| `{ "message": "The request could not be completed. Try again." }` | anything else, `503`, so the provider knows it may resend |

## Auth

`AUTH_MODE` selects the mode. The default `anonymous` mode trusts the caller as described above, so a local run needs no identity provider.

The `jwt` mode is the optional Keycloak profile:

```bash
docker compose --profile auth up -d
```

Set `AUTH_MODE=jwt`, `OIDC_ISSUER=http://127.0.0.1:8080/realms/fortune-tiger`,
`OIDC_AUDIENCE=fortune-tiger-api`, and
`OIDC_JWKS_URL=http://127.0.0.1:8080/realms/fortune-tiger/protocol/openid-connect/certs`, restart the API, and ask Keycloak for a token:

```bash
curl -s -X POST http://127.0.0.1:8080/realms/fortune-tiger/protocol/openid-connect/token \
  -d grant_type=password -d client_id=fortune-tiger-api \
  -d username=provider-a -d password=provider-a
```

The access token carries `provider_id: provider-a`. Send it as `Authorization: Bearer <access_token>`; the API verifies the signature against the realm key set and answers `401` with `{ "message": "A valid bearer token is required." }` when the token is missing, expired, signed by another key, or without that claim. Health and metrics stay open.

## Health and metrics

```http
GET /health/live
GET /health/ready
GET /metrics
```

`/health/live` answers `200` with `{ "status": "live" }`. `/health/ready` asks PostgreSQL and SQS at the same time and answers `200` with `{ "status": "ready" }` or `503` with `{ "status": "unavailable" }`. MongoDB stays out of readiness on purpose: the audit timeline and the journey are not on the financial path.

`/metrics` answers `text/plain; version=0.0.4; charset=utf-8` with the Prometheus exposition: `wager_transactions_*_total`, `idempotency_duplicates_total`, `consumer_retries_total`, `consumer_dead_letters_total`, `lock_conflicts_total`, `outbox_lag_milliseconds`, `wager_processing_milliseconds`, `reconciliation_divergence`, `audit_events_persisted_total`, `audit_events_duplicates_total`, `audit_events_failures_total`, `journey_events_recorded_total`, and `journey_events_failures_total`. Counters live in the process that served the request.

## Queue

The queue is an internal channel with two directions. `wager-transactions.fifo` carries requests into the consumer, and `wager-transactions-dlq.fifo` holds a request the consumer gave up on. After the financial commit, the outbox publishes `WagerTransactionProcessed`, `WagerTransactionRejected`, `WagerTransactionPendingReference`, and `WalletBalanceChanged` when the balance changed to `wager-events.fifo`. The audit consumer reads that channel and appends the timeline; a delivery it cannot store retries five times and then moves to `wager-events-dlq.fifo`. Read the events locally with:

```bash
docker exec fortune-tiger-localstack-1 awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/wager-events.fifo \
  --max-number-of-messages 10
```
