# Protocols

A plug-in contract. The folder is `protocols`, inside `infrastructure`. The file role is `protocol`. The type name ends with `Protocol`.

`TheoryProtocol` carries the parameters of a case and the expected boolean. The test reads `params`, produces the actual boolean, and compares it with `expected`. A case may also carry a `title` and a `description`. The description uses `WHEN` and `SHOULD`.

`PatternProtocol` has an input and an output. `test` receives the input and returns the output. `MoneyAmountPattern` and `MoneyCurrencyPattern` implement it. The money expression stays a `private readonly` property on those classes. This file does not sit in `domain`. The files are `theory.protocol.ts` and `pattern.protocol.ts`. `index.ts` reexports them with `export *`. Callers import the folder.

This is not a wager rule, so it does not sit in `domain`. It is not HTTP, so it does not sit in `presentation`. A folder named `shared` or `utils` does not hold it.

All project text is English, including the root `README.md`.
