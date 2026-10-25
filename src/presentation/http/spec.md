# HTTP

Delivery is at-least-once. The system stays correct under duplicates, out-of-order delivery, multiple instances, and a process dying mid-flight.

Global invariants: do not double-credit, do not double-debit, do not lose a committed event, do not allow a negative balance.

The controller is thin. It parses the request, calls the use case, maps the result, and chooses the status. No balance rule here.

## Wallet

- `POST /wallets` — `playerId` and `initialBalance`, both required. `OpenWalletUseCase` obtains the opening time and calls `WALLET_OPENING`. An initial balance above zero creates `OPENING` and `CREDIT` in the same SQL transaction. A duplicate `playerId` + `currency` is a conflict. The body returns `id`, `playerId`, `balance`, and `version`. `201` on creation.
- `GET /wallets/:walletId` — `id`, `playerId`, `balance`, `version`. `FindWalletUseCase` loads the wallet. `HttpFailureFilter` maps `WalletNotFoundError` to `404`.
- `GET /wallets/:walletId/ledger?cursor=&limit=50` — `{ items, nextCursor }`. `ListWalletLedgerUseCase` verifies the wallet and reads the page. Each item carries `id`, `transactionId`, `direction`, `amount`, `balanceBefore`, `balanceAfter`, and `createdAt`. An item is ordered by `id`, which is UUIDv7, and `nextCursor` is the base64url of the last `id` of the page. `nextCursor` is absent on the last page. `limit` defaults to `50` and is capped at `100`. An invalid `cursor` or `limit` answers `400`. `404` when the wallet is absent.
- `POST /wallets/:walletId/reconciliation` — `ReconcileWalletUseCase` loads and compares the snapshot; see `src/application/reconciliations/spec.md`. `200` with the comparison, `404` with `failureCode: WALLET_NOT_FOUND` when the wallet is absent.

## Wager

- `POST /wagering/transactions` with a required `Idempotency-Key` header. The body returns `transactionId`, `status`, `balance`, `idempotentReplay`, and `failureCode` when the wager carries one. The route calls `SubmitWagerUseCase.execute`.
- `GET /wagering/transactions/:transactionId` — `FindWagerUseCase` returns the wager: `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `status`, `money`, `failureCode`, and `createdAt`. `404` when the wager is absent.
- `GET /providers/:providerId/wagering/transactions/:externalTransactionId` — `FindWagerByProviderUseCase` returns the same body by provider pair.

`OPENING` is not accepted: the use case rejects it with `OPENING_NOT_ALLOWED`.

## Journey

Two read-only routes answer the per-caller journey. Both go through `AuthGuard`, so the caller identity decides the scope.
The query is validated by `queries/journey.query.ts`: `stage` and `outcome` must be one of the enums, `from` and `to` ISO-8601 inclusive bounds, `limit` between `1` and `100`, default `50`. An invalid value answers `400` with `INVALID_JOURNEY_QUERY_MESSAGE`. Ordering is `occurredAt` then `stepId` (the deterministic tie-break), and the page limit is applied before the response. A step is mapped by `JourneyOutputMapper` and output `JourneyTimelineOutputDto` — `{ items }` where each item carries `stepId`, `flowId`, `stage`, `operation`, `outcome`, `occurredAt`, `durationMs`, `providerId`, `playerId`, `wagerId`, `walletId`, and `failureCode`. No amount, balance, token, or header ever appears on a step.

- `GET /wagering/transactions/:transactionId/journey` — the steps of the flow that produced the wager. It loads the wager and answers a foreign one with the same `WagerNotFoundError` as the wager route, so another provider cannot read a journey. The `flowId` is the wager `idempotencyKey`, and the caller provider is taken from `request.provider`.
- `GET /providers/:providerId/players/:playerId/journey` — the steps of the flows of a player, for one provider. A `:providerId` that is not the caller answers `JourneyNotFoundError` and `404`, so no provider reads another provider's picture of a player. A player of the caller provider with no recorded steps answers `200` with `{ items: [] }`.

`JourneyNotFoundError` lives in `src/application/journeys`; `HttpFailureFilter` maps it to `404` with `JOURNEY_NOT_FOUND_MESSAGE`, and the same filter maps the wallet and wager not-found errors.

The presentations records the `ROUTE` stage: `JourneyInterceptor` in `interceptors/` starts a stopwatch and, after the handler returns or throws, writes one `ROUTE` step with the `flowId` from `request.flowId` (set by the controller from the idempotency key), the caller provider, and the outcome and duration. Recording is fire-and-forget, so the route answer never waits on MongoDB. The `USE_CASE`, `DATABASE`, and `QUEUE` stages are recorded by the use cases, the persistence writers, and the outbox publisher; see `src/application/journeys/spec.md` and `src/infrastructure/journey/spec.md`.

## Status

Decision. Stable across every endpoint.

| Situation | HTTP |
| --- | --- |
| Invalid payload | 400 |
| Missing, expired, or badly signed bearer token in the `jwt` auth mode | 401 |
| Missing resource | 404 |
| Idempotency key with a different payload, or a duplicate wallet | 409 |
| Business rule, `failureCode` in the body | 422 |
| `PENDING` or `PENDING_REFERENCE` | 202 |
| Transient infrastructure failure, or a `FAILED` wager | 503 |
| `PROCESSED`, replay (`idempotentReplay: true`), and an already terminal `REJECTED` | 200 |
| Wallet created | 201 |

A replay answers `200` even when the stored wager is `REJECTED`: the body is the original result, and `idempotentReplay` is `true`.

`HttpFailureFilter` maps an error to the table. A Nest `HttpException` keeps its status. `WalletNotFoundError` and `WagerNotFoundError` answer `404`; the reconciliation error preserves its structured not-found response. The wallet conflict message answers `409`. `ProviderIdentityError` answers `401` with its message. `HealthReadinessError` preserves the health `503` body. Any other error goes to the logger and answers `503`, so the provider knows it may resend.

## Documentation

- `GET /docs` serves the Swagger UI and answers `200` with HTML.
- `GET /docs-json` serves the same document as OpenAPI 3 JSON and answers `200`.

Both stay open. `HealthController` and `MetricsController` carry `@ApiExcludeController`, so the document covers the provider routes only and health and metrics stay out of it.

`factories/swagger.factory.ts` holds the document: the title, the version, the description of the two auth modes, the `bearer` security scheme, and the tags. `createDocument` and `mountDocs` are module functions, not a Nest provider, because the document is built after the container exists. `main.ts` mounts it before listening, and the end-to-end setup mounts the same document, so a test reads the routes a provider reads.

`ApiTags` groups the routes into `Wallet` and `Wager`. The request DTOs carry `ApiProperty`, and the output DTOs in `dtos/` describe the response body, so every route shows its shape and its example. The controller imports the body DTO as a value, not as a type, so the Nest metadata carries the class: the `ValidationPipe` validates it and the document describes it. `ApiBearerAuth` adds no requirement: the default mode is anonymous, and the description states that the `jwt` mode takes the token. `X-Provider-Id` is documented as an optional header on the wager routes, and `Idempotency-Key` as a required header on `POST /wagering/transactions`. A `422` documents the `failureCode` body, and `400`, `404`, `409`, and `503` document the status table above.

## Auth

Decision: one guard, two modes, selected by `AUTH_MODE`. The default `anonymous` mode keeps the local run free of an identity provider. The `jwt` mode requires a bearer token.

`AuthGuard` is the extension point. It resolves the identity of the request through `PROVIDER_IDENTITY` and stores it on `request.provider`. `ProviderIdentityProtocol` lives beside the HTTP provider and answers a promise, because the JWT mode reaches a remote key set.

- `AnonymousProviderIdentity` reads the `X-Provider-Id` header and falls back to the `providerId` of the body, so the caller is trusted.
- `JwtProviderIdentity` reads the token from the `Authorization: Bearer` header, verifies it against the JWKS at `OIDC_JWKS_URL`, checks the issuer and the audience when they are configured, and reads the `provider_id` claim as the caller. A missing header, a malformed token, an expired token, a signature that does not match, or a payload without that claim throws `ProviderIdentityError`, which answers `401`. A key set that cannot be reached is not a credential problem: the error leaves the provider and answers `503`.

Health stays open. The queue is an internal channel, and the provider identity inside a message still goes through domain rules.

Keycloak is optional: it runs in compose under the `auth` profile with the realm import in `docker/keycloak/`, and the API stays in `anonymous` unless `AUTH_MODE=jwt` is set.

## Module

`http.module.ts` imports `PersistenceModule`, `WagersModule`, `ReconciliationsModule`, `AuditsModule`, `JourneysModule`, `ObservabilityModule`, and `EnvironmentModule`. It declares `WalletController` and `WagerController`, and provides `OpenWalletUseCase`, `FindWalletUseCase`, and `ListWalletLedgerUseCase`; `ReconcileWalletUseCase` comes from `ReconciliationsModule`. `AuthGuard` is applied to `WagerController`. `ProviderIdentityFactory` reads `Environment` and builds one identity: the anonymous implementation by default, the JWT implementation in the `jwt` mode. `PROVIDER_IDENTITY` is bound with `useFactory` over that class, and its token lives in this module's `tokens/` folder. `WalletController` receives wallet use cases by class. `WagerController` receives its route use cases by class (the two wager readers, the audit use case, and `FindJourneyUseCase`), `CLOCK` and `LOGGER` by token, and `JourneyService` by class. `JourneyInterceptor` is provided here and applied over the wager routes and the wallet routes that mutate state; it records the `ROUTE` stage through `JourneyService`. `CLOCK` lives in `application/time/tokens`; `LOGGER` lives in `application/observability/tokens`.

`wager.dto.ts` and `wallet.dto.ts` in `dtos/` declare the request shape with `class-validator` decorators. The Nest `ValidationPipe` in `main.ts` validates every `@Body()` against the DTO class and answers `400` on mismatch. After validation, `WagerDtoMapper` and `WalletDtoMapper` in `mappers/` convert the validated DTO into `HttpType.WagerInput` and `HttpType.WalletInput` — building domain `Money` and checking cross-field rules (reference required for `REFUND`/`ROLLBACK`). A missing `Idempotency-Key` answers `400` with `IDEMPOTENCY_KEY_REQUIRED_MESSAGE`.

`mappers/` turns the body into `WagersType.SubmitInput`, the wallet into its output, the ledger entry into its output, and the wager into its output. `maps/wager-status.map.ts` holds the status table, and `WagerStatus` in `statuses/` answers the HTTP status of one `SubmitOutput`.

`guards/` holds `AuthGuard`, `filters/` holds `HttpFailureFilter`, `providers/` holds the identity protocol and its two implementations, and `errors/` holds `ProviderIdentityError`. The global filter translates application errors into HTTP responses; controllers do not need per-route `try/catch` blocks for these errors.

## Folder structure

```text
http/
  controllers/
    wager.controller.ts
    wallet.controller.ts
  data/
    documentation.data.ts
    messages.data.ts
  dtos/
    journey-output.dto.ts
    ledger-output.dto.ts
    money.dto.ts
    reconciliation-output.dto.ts
    wager.dto.ts
    wager-output.dto.ts
    wallet.dto.ts
    wallet-output.dto.ts
  errors/
    provider-identity.error.ts
  factories/
    provider-identity.factory.ts
    swagger.factory.ts
  filters/
    http-failure.filter.ts
  guards/
    auth.guard.ts
  interceptors/
    journey.interceptor.ts
  mappers/
    journey-output.mapper.ts
    ledger-output.mapper.ts
    wager-dto.mapper.ts
    wager-input.mapper.ts
    wager-output.mapper.ts
    wager-submit.mapper.ts
    wallet-dto.mapper.ts
    wallet-output.mapper.ts
  maps/
    wager-status.map.ts
  providers/
    anonymous-provider.identity.ts
    jwt-provider.identity.ts
    provider.identity.protocol.ts
  queries/
    journey.query.ts
    ledger.query.ts
  statuses/
    wager.status.ts
  tests/
  types.ts
  http.module.ts
  index.ts
  spec.md
```

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
