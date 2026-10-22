# Wallet guards

A guard checks one rule and refuses it by throwing. One rule per class. Each class is a concrete domain rule with the method `guard`; domain guards do not depend on application contracts.

The class name joins the concept, the subject, and the role: `WalletSignGuard`. The file is `kebab-case` with the role as a suffix: `wallet-sign.guard.ts`. `index.ts` reexports the classes with `export *`, and callers import the folder. A guard is not reexported by `src/domain/wallet/index.ts`.

The guard only checks. It reads the `Money` it receives and it does not build one. The text comes from `data/`. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule, and each guard stays individual.

| Guard | Input | Rule | Message |
| --- | --- | --- | --- |
| `WalletSignGuard` | `Money` | the operation amount is not negative | `NEGATIVE_AMOUNT_MESSAGE` |
| `WalletCurrencyGuard` | `WalletType.Conflict` | the operation currency equals the wallet currency | `CURRENCY_CONFLICT_MESSAGE` |
| `WalletFundsGuard` | `Money` | the balance after the debit is not negative | `INSUFFICIENT_FUNDS_MESSAGE` |

`Wallet` holds one instance of each as a `const` at the top of `wallet.ts`. `open` calls `WalletSignGuard`, `debit` and `credit` call `WalletSignGuard` and `WalletCurrencyGuard` through the private `assertCurrency`, and `debit` calls `WalletFundsGuard` on the balance it computed.

Unit tests live in `tests/`, as `{subject}.guard.test.ts`, using the test-only `Theory` type and copy in `WHEN` / `SHOULD`.

All project text is English, including the root `README.md`.
