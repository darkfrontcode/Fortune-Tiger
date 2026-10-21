# Protocols

A plug-in contract. The folder is `protocols`, inside `application`. The file role is `protocol`. The type name ends with `Protocol`.

`TheoryProtocol` carries the parameters of a case and the expected boolean. The test reads `params`, produces the actual boolean, and compares it with `expected`. A case may also carry a `title` and a `description`. The description uses `WHEN` and `SHOULD`.

`PatternProtocol` has an input and an output. `test` receives the input and returns the output. `MoneyAmountPattern` and `MoneyCurrencyPattern` implement it. The money expression stays a `private readonly` property on those classes. It is not a method and not a `const` above the class. The protocol does not live in `domain`.

`MapperProtocol` has an input and an output. `map` receives the input and returns the output. `WagerEventsMapper` implements it: the mediated wager becomes the outbox rows.

`WagerStrategyProtocol` mediates one `WagerTransactionKind` against a wallet and an optional reference. Strategies live in `transactions/wager/strategies/`.

`WagerGatewayProtocol` persists one wager inside the SQL transaction. The MikroORM adapter is `WagerSubmitWriter` in `src/infrastructure/persistence/wager`.

`ReconciliationGatewayProtocol` loads the wallet balance and ledger entries for one wallet. The MikroORM adapter is `ReconciliationReader` in `src/infrastructure/persistence/reconciliation`.

`LoggerProtocol` and `MetricProtocol` are observability hooks. `SimpleLogger` and the metric adapter land in `src/infrastructure/observability`.

The files are `theory.protocol.ts`, `pattern.protocol.ts`, `mapper.protocol.ts`, `logger.protocol.ts`, `metric.protocol.ts`, `reconciliation.gateway.protocol.ts`, `wager.gateway.protocol.ts`, and `wager.strategy.protocol.ts`. `index.ts` reexports them with `export *`. Callers import the folder.

All project text is English, including the root `README.md`.
