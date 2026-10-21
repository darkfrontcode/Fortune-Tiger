# Protocols

A plug-in contract. The folder is `protocols`, inside `application`. The file role is `protocol`. The type name ends with `Protocol`.

`TheoryProtocol` carries the parameters of a case and the expected boolean. The test reads `params`, produces the actual boolean, and compares it with `expected`. A case may also carry a `title` and a `description`. The description uses `WHEN` and `SHOULD`.

`PatternProtocol` has an input and an output. `test` receives the input and returns the output. `MoneyAmountPattern` and `MoneyCurrencyPattern` implement it. The money expression stays a `private readonly` property on those classes. It is not a method and not a `const` above the class. The protocol does not live in `domain`.

`WagerStrategyProtocol` mediates one `WagerTransactionKind` against a wallet and an optional reference. Strategies live in `transactions/wager/strategies/`.

`WagerGatewayProtocol` persists one wager inside the SQL transaction. The MikroORM adapter is `WagerSubmitWriter` in `src/infrastructure/persistence/wager`.

The files are `theory.protocol.ts`, `pattern.protocol.ts`, `wager.gateway.protocol.ts`, and `wager.strategy.protocol.ts`. `index.ts` reexports them with `export *`. Callers import the folder.

All project text is English, including the root `README.md`.
