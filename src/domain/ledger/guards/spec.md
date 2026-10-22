# Ledger guards

A guard checks one rule. A guard that refuses throws; a guard that only answers returns a `boolean`. One rule per class. Every class here implements `GuardProtocol` from `application/protocols`, and the protocol method is `guard`.

The class name joins the concept, the subject, and the role: `LedgerEquationGuard`. The file is `kebab-case` with the role as a suffix: `ledger-equation.guard.ts`. `index.ts` reexports the classes with `export *`, and callers import the folder. A guard is not reexported by `src/domain/ledger/index.ts`.

The input of the three guards is `LedgerType.Movement`: the direction, the balance before, the money, and the balance after. The text comes from `data/`.

| Guard | Rule | Answer |
| --- | --- | --- |
| `LedgerCurrencyGuard` | the balance before, the money, and the balance after share one currency | `boolean` |
| `LedgerMovementGuard` | the direction moves the money from the balance before to the balance after | `boolean` |
| `LedgerBalanceGuard` | the entry is aligned and the movement closes it | `boolean` |
| `LedgerEquationGuard` | the entry is aligned and closed | throws `CURRENCY_CONFLICT_MESSAGE` when the currencies differ, and `BALANCE_EQUATION_MESSAGE` when the movement does not close |

A guard may hold other guards inside when the rule is composed. Each one stays individual: `LedgerBalanceGuard` and `LedgerEquationGuard` hold one instance of `LedgerCurrencyGuard` and one of `LedgerMovementGuard`, and neither repeats the currency or the movement expression. A guard that composes another one asks it; it does not restate the inner rule.

`Ledger` holds one instance of `LedgerBalanceGuard` and one of `LedgerEquationGuard` as a `const` at the top of `ledger.ts`, and `Ledger.create` calls `LedgerEquationGuard`. `Ledger.isBalanced` calls `LedgerBalanceGuard` and never throws.

Unit tests live in `__tests__/`, as `{subject}.guard.spec.ts`, in the `TheoryProtocol` shape, with copy in `WHEN` / `SHOULD`.

All project text is English, including the root `README.md`.
