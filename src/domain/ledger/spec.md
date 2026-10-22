# Ledger

State is a `schema`. There is no underscored field. `create` returns a new instance. Nothing writes the schema after that.

`WalletLedgerEntry` has no mutable field and no transition. `create` checks `balanceBefore ± money = balanceAfter`. `rehydrate` only rebuilds.

Direction is `DEBIT` or `CREDIT`, the enum `LedgerDirection` in `enums/ledger-direction.enum.ts`. `enums/index.ts` reexports it. The guards live in `guards/`, one class per rule, and each one is a concrete rule with the method `guard`. `LedgerCurrencyGuard` answers whether the three amounts share one currency, `LedgerMovementGuard` answers whether the direction moves the money to the closing balance, and `LedgerBalanceGuard` composes those two and answers whether the entry is balanced. `LedgerEquationGuard` composes the same two and refuses an entry that fails either rule. A guard that composes another one holds an instance of it. `guards/spec.md` describes each one, and `ledger.ts` holds one instance of the equation guard and one of the balance guard as a `const` at the top of the file. `create` calls `LedgerEquationGuard`, and `isBalanced` asks `LedgerBalanceGuard` without throwing. Error text is `data/messages.data.ts`. At most one entry per transaction and per wallet. `LOSS` and any `REJECTED` transaction produce no entry. No update and no delete.

Double-entry is out.

The stored balance equals the balance reconstructed from these entries.

Unit tests live in `tests/ledger.test.ts`. Each guard has its own spec, in `guards/tests/{subject}.guard.test.ts`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
