# Money

State is a `schema`. There is no underscored field. An operation returns a new instance.

Types of this concept live in `types.ts`, in the namespace `MoneyType`. `Schema` is the state: a `Decimal` amount and the currency. `Input` is what `from` receives. `Output` is what `toJSON` returns. Both carry a decimal string and the currency. The word `props` is not a type name and not a parameter name.

Immutable. `amount` is received and serialized as a decimal string with 2 places. Currency is ISO-4217. Every operation returns a new instance.

Operations: add, subtract, negate. Queries: zero, positive, negative, less-than, equals. `toJSON` returns `MoneyType.Output`. Different currencies throw inside the operation.

Reject on input: `NaN`, `Infinity`, scientific notation, empty string, more than 2 decimal places, negative amount.

The happy path uses `BRL`. The model accepts another currency, and the currency conflict has a test.

The domain uses `decimal.js`. No ORM money type. No Nest decorator. Factories: `from`, `zero`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
