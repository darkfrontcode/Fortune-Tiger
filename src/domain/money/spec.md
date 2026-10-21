# Money

State is a `schema`. There is no underscored field. An operation returns a new instance.

Types of this concept live in `types.ts`, in the namespace `MoneyType`. `Schema` is the state: a `Decimal` amount and the currency. `Input` is what `from` receives. `Output` is what `toJSON` returns. Both carry a decimal string and the currency. The word `props` is not a type name and not a parameter name.

Immutable. `amount` is received and serialized as a decimal string with 2 places. Currency is ISO-4217. Every operation returns a new instance.

Operations: add, subtract, negate. Queries: zero, positive, negative, less-than, equals. `toJSON` returns `MoneyType.Output`. Add, subtract, and less-than throw when the currencies differ. `equals` returns false in that case.

Reject on input: `NaN`, `Infinity`, scientific notation, empty string, more than 2 decimal places, negative amount. Those checks live in `MoneyGuard` (`money.guard.ts`). `amount` checks the amount. `currency` checks the currency. `equal` throws when two currencies differ. `from` calls `amount` and `currency`, then builds the `Decimal`. `zero` calls `currency`. Add, subtract, and less-than call `equal`. The guard does not build `Money`. The amount expression and the currency expression live in `patterns/amount.pattern.ts` and `patterns/currency.pattern.ts`. Each expression is a `private readonly` property on its class. It is not a method and not a `const` above the class. `MoneyAmountPattern` and `MoneyCurrencyPattern` implement `PatternProtocol` from `infrastructure/protocols`. `test` receives the text and returns whether it fits. `MoneyGuard` calls `test`. `patterns/index.ts` reexports the classes with `export *`. The protocol does not live in this folder. Error text is one constant per phrase in `data/messages.data.ts`. The name is `UPPER_SNAKE_CASE` and ends with `_MESSAGE`: `INVALID_MONEY_AMOUNT_MESSAGE`, `INVALID_CURRENCY_MESSAGE`, `CURRENCY_CONFLICT_MESSAGE`. `data/index.ts` reexports them with `export *`. Callers import the folder.

The happy path uses `BRL`. The model accepts another currency, and the currency conflict has a test.

The domain uses `decimal.js`. No ORM money type. No Nest decorator. Factories: `from`, `zero`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
