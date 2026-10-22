# Protocols

A plug-in contract. The folder is `protocols`, inside `application`. The file role is `protocol`. The type name ends with `Protocol`.

`TheoryProtocol` carries the parameters of a case and the expected boolean. The test reads `params`, produces the actual boolean, and compares it with `expected`. A case may also carry a `title` and a `description`. The description uses `WHEN` and `SHOULD`.

`PatternProtocol` has an input and an output. `test` receives the input and returns the output. `MoneyAmountPattern` and `MoneyCurrencyPattern` implement it. The money expression stays a `private readonly` property on those classes. It is not a method and not a `const` above the class. The protocol does not live in `domain`.

`GuardProtocol` has an input and an output. `guard` receives the input. A guard that refuses returns nothing and throws: the output is `void`. A guard that only answers returns a `boolean`. One class per rule, in the `guards` folder of the concept or use case that owns it. The owner instantiates it once. A guard may hold other guards inside when the rule is composed, as `LedgerBalanceGuard` does, and each one stays individual. `MoneyAmountGuard`, `WalletSignGuard`, `LedgerEquationGuard`, `WagerReferenceGuard`, and `IdempotencyHashGuard` implement it.

`MapperProtocol` has an input and an output. `map` receives the input and returns the output. `WagerEventsMapper` implements it: the mediated wager becomes the outbox rows.

`WagerStrategyProtocol` mediates one `WagerTransactionKind` against a wallet and an optional reference. Strategies live in `transactions/wager/strategies/`.

`WagerGatewayProtocol` persists one wager inside the SQL transaction. The MikroORM adapter is `WagerSubmitWriter` in `src/infrastructure/persistence/wager`.

`ReconciliationGatewayProtocol` loads the wallet balance and ledger entries for one wallet. The MikroORM adapter is `ReconciliationReader` in `src/infrastructure/persistence/reconciliation`.

`ReferenceReaderProtocol` returns the ids of the `PENDING_REFERENCE` wagers due at a time, up to a limit. The MikroORM adapter is `ReferenceReader` in `src/infrastructure/persistence/wager`.

`ReferenceGatewayProtocol` retries one wager inside the SQL transaction and returns its status, or nothing when the wager is gone or terminal. The MikroORM adapter is `ReferenceRetryWriter` in `src/infrastructure/persistence/wager`.

`PublisherProtocol` sends one outbox event to the queue. `publish` receives `Published` from `publisher.protocol.ts`: `id`, `aggregateId`, and `payload`. `SqsPublisher` in `src/infrastructure/messaging/publishers` implements it. The protocol does not know SQS.

`LoggerProtocol` and `MetricProtocol` are observability hooks. `SimpleLogger` and the metric adapter land in `src/infrastructure/observability`.

`ClockProtocol` is the injectable clock. `now` returns a `Date`. `SystemClock` implements it in `src/infrastructure/observability`.

A protocol carries no runtime value. The container identity of a port is a token. Each token lives in the `tokens/` folder of its owning module, one file each, with the `UPPER_SNAKE_CASE` name of the protocol without the suffix. Cross-cutting application tokens live in `src/application/dependencies/tokens`. A consumer injects the token and never the adapter class.

`ReadinessProtocol` has one method, `check`, and answers whether one dependency is reachable. `DatabaseReadiness` in `src/infrastructure/persistence` and `QueueReadiness` in `src/infrastructure/messaging` implement it. `CheckHealthReadinessUseCase` composes them, and that is how the readiness probe reaches Postgres and SQS.

`WalletReaderProtocol` has one method, `findById`, and returns the wallet or nothing. `WalletOpeningProtocol` has one method, `open`, receives `playerId`, `initialBalance`, and `openedAt`, and returns the wallet. `LedgerReaderProtocol` has one method, `page`, receives `walletId`, `cursor`, and `limit`, and returns `{ items, nextCursor }`. `WagerReaderProtocol` has `findById` and `findByProviderAndExternal`, and each returns the wager or nothing. The MikroORM adapters are `WalletReader`, `WalletOpeningWriter`, `LedgerReader`, and `WagerReader` in `src/infrastructure/persistence`.

`ProviderIdentityProtocol` has one method, `identify`, receives the `X-Provider-Id` header and the `providerId` of the body, and returns the provider of the request. `AnonymousProviderIdentity` in `src/presentation/http` trusts the caller and is the extension point for a real identity provider.

The files are `theory.protocol.ts`, `pattern.protocol.ts`, `guard.protocol.ts`, `mapper.protocol.ts`, `publisher.protocol.ts`, `logger.protocol.ts`, `metric.protocol.ts`, `clock.protocol.ts`, `readiness.protocol.ts`, `provider.identity.protocol.ts`, `wallet.reader.protocol.ts`, `ledger.reader.protocol.ts`, `wager.reader.protocol.ts`, `reconciliation.gateway.protocol.ts`, `reference.gateway.protocol.ts`, `reference.reader.protocol.ts`, `wager.gateway.protocol.ts`, and `wager.strategy.protocol.ts`. `index.ts` reexports them with `export *`. Callers import the folder.

All project text is English, including the root `README.md`.
