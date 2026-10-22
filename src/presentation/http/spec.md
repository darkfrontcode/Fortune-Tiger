# HTTP

Delivery is at-least-once. The system stays correct under duplicates, out-of-order delivery, multiple instances, and a process dying mid-flight.

Global invariants: do not double-credit, do not double-debit, do not lose a committed event, do not allow a negative balance.

The controller is thin. It parses the request, calls the use case, maps the result, and chooses the status. No balance rule here.

## Wallet

- `POST /wallets` — `playerId` and `initialBalance`, both required. An initial balance above zero creates `OPENING` and `CREDIT` in the same SQL transaction. The route calls `WALLET_OPENING`. A duplicate `playerId` + `currency` is a conflict. The body returns `id`, `playerId`, `balance`, and `version`. `201` on creation.
- `GET /wallets/:walletId` — `id`, `playerId`, `balance`, `version`. `FindWalletUseCase` loads the wallet. `HttpFailureFilter` maps `WalletNotFoundError` to `404`.
- `GET /wallets/:walletId/ledger?cursor=&limit=50` — `{ items, nextCursor }`. Each item carries `id`, `transactionId`, `direction`, `amount`, `balanceBefore`, `balanceAfter`, and `createdAt`. An item is ordered by `id`, which is UUIDv7, and `nextCursor` is the base64url of the last `id` of the page. `nextCursor` is absent on the last page. `limit` defaults to `50` and is capped at `100`. An invalid `cursor` or `limit` answers `400`. `404` when the wallet is absent.
- `POST /wallets/:walletId/reconciliation` — see `src/application/reconciliations/spec.md`. `200` with the comparison, `404` with `failureCode: WALLET_NOT_FOUND` when the wallet is absent.

## Wager

- `POST /wagering/transactions` with a required `Idempotency-Key` header. The body returns `transactionId`, `status`, `balance`, `idempotentReplay`, and `failureCode` when the wager carries one. The route calls `WagerService.submit`.
- `GET /wagering/transactions/:transactionId` — the wager: `transactionId`, `providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `status`, `money`, `failureCode`, and `createdAt`. `404` when the wager is absent.
- `GET /providers/:providerId/wagering/transactions/:externalTransactionId` — the same body as the previous route, found by the provider pair.

`OPENING` is not accepted: the use case rejects it with `OPENING_NOT_ALLOWED`.

## Status

Decision. Stable across every endpoint.

| Situation | HTTP |
| --- | --- |
| Invalid payload | 400 |
| Missing resource | 404 |
| Idempotency key with a different payload, or a duplicate wallet | 409 |
| Business rule, `failureCode` in the body | 422 |
| `PENDING` or `PENDING_REFERENCE` | 202 |
| Transient infrastructure failure, or a `FAILED` wager | 503 |
| `PROCESSED`, replay (`idempotentReplay: true`), and an already terminal `REJECTED` | 200 |
| Wallet created | 201 |

A replay answers `200` even when the stored wager is `REJECTED`: the body is the original result, and `idempotentReplay` is `true`.

`HttpFailureFilter` maps an error to the table. A Nest `HttpException` keeps its status. `WalletNotFoundError` answers `404`, and the wallet conflict message answers `409`. Any other error goes to the logger and answers `503`, so the provider knows it may resend.

## Auth

Decision: no identity provider. `AuthGuard` is the extension point and allows every request. `ProviderIdentityProtocol`, in `src/application/protocols`, resolves the provider of the request; `AnonymousProviderIdentity` reads the `X-Provider-Id` header and falls back to the `providerId` of the body, so the caller is trusted. A real identity provider replaces that class and the guard starts to refuse.

Health stays open. The queue is an internal channel, and the provider identity inside a message still goes through domain rules.

Keycloak is out.

## Module

`http.module.ts` imports `PersistenceModule`, `TransactionsModule`, `ReconciliationsModule`, and `ObservabilityModule`. It declares `WalletController` and `WagerController`, and provides `FindWalletUseCase` for the wallet lookup route. `AuthGuard` is applied to `WagerController`, and `PROVIDER_IDENTITY` is bound to `AnonymousProviderIdentity`; its token lives in this module's `tokens/` folder. `WalletController` receives `FindWalletUseCase` by class, `WALLET_OPENING`, `WALLET_READER`, `LEDGER_READER`, and `CLOCK` by token, plus `ReconciliationService` by class. `WagerController` receives `WagerService` by class and `WAGER_READER` and `CLOCK` by token. Cross-cutting `CLOCK` and `LOGGER` tokens live in `application/dependencies/tokens`.

`wager.dto.ts` and `wallet.dto.ts` in `dtos/` declare the request shape with `class-validator` decorators. The Nest `ValidationPipe` in `main.ts` validates every `@Body()` against the DTO class and answers `400` on mismatch. After validation, `WagerDtoMapper` and `WalletDtoMapper` in `mappers/` convert the validated DTO into `HttpType.WagerInput` and `HttpType.WalletInput` — building domain `Money` and checking cross-field rules (reference required for `REFUND`/`ROLLBACK`). A missing `Idempotency-Key` answers `400` with `IDEMPOTENCY_KEY_REQUIRED_MESSAGE`.

`mappers/` turns the body into `TransactionsType.SubmitInput`, the wallet into its output, the ledger entry into its output, and the wager into its output. `maps/wager-status.map.ts` holds the status table, and `WagerStatus` in `statuses/` answers the HTTP status of one `SubmitOutput`.

`guards/` holds `AuthGuard`, `filters/` holds `HttpFailureFilter`, and `providers/` holds `AnonymousProviderIdentity`. The global filter translates application errors into HTTP responses; controllers do not need per-route `try/catch` blocks for these errors.

## Folder structure

```text
http/
  controllers/
    wager.controller.ts
    wallet.controller.ts
  data/
    messages.data.ts
  dtos/
    money.dto.ts
    wager.dto.ts
    wallet.dto.ts
  filters/
    http-failure.filter.ts
  guards/
    auth.guard.ts
  mappers/
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
  queries/
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
