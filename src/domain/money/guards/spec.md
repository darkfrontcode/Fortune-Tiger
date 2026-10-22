# Money guards

A guard checks one rule and refuses it by throwing. One rule per class. Every class here implements `GuardProtocol` from `application/protocols`, and the protocol method is `guard`.

The class name joins the concept, the subject, and the role: `MoneyAmountGuard`. The file is `kebab-case` with the role as a suffix: `money-amount.guard.ts`. `index.ts` reexports the classes with `export *`, and callers import the folder. A guard is not reexported by `src/domain/money/index.ts`.

The guard only checks. The pattern stays in `patterns/`, and the guard calls `test` on it. The guard does not build `Money`, and it does not hold the message logic: the text comes from `data/`. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule, and each guard stays individual.

| Guard | Input | Rule | Message |
| --- | --- | --- | --- |
| `MoneyAmountGuard` | `string` | the amount text fits the amount pattern | `INVALID_MONEY_AMOUNT_MESSAGE` |
| `MoneyCurrencyGuard` | `string` | the currency text fits the ISO-4217 pattern | `INVALID_CURRENCY_MESSAGE` |
| `MoneyConflictGuard` | `MoneyType.Conflict` | both currencies are the same | `CURRENCY_CONFLICT_MESSAGE` |

`Money` holds one instance of each as a `const` at the top of `money.ts`. `from` calls `MoneyAmountGuard` and `MoneyCurrencyGuard`, `zero` calls `MoneyCurrencyGuard`, and `add`, `subtract`, and `isLessThan` call `MoneyConflictGuard` through the private `assertCurrency`.

Unit tests live in `__tests__/`, as `{subject}.guard.spec.ts`, in the `TheoryProtocol` shape, with copy in `WHEN` / `SHOULD`.

All project text is English, including the root `README.md`.
