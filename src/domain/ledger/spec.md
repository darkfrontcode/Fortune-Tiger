# Ledger

State is a `schema`. There is no underscored field. `create` returns a new instance. Nothing writes the schema after that.

`WalletLedgerEntry` has no mutable field and no transition. `create` checks `balanceBefore ± money = balanceAfter`. `rehydrate` only rebuilds.

Direction is `DEBIT` or `CREDIT`, the enum `LedgerDirection` in `enums/ledger-direction.enum.ts`. `enums/index.ts` reexports it. The guard is `ledger.guard.ts`. Error text is `data/messages.data.ts`. At most one entry per transaction and per wallet. `LOSS` and any `REJECTED` transaction produce no entry. No update and no delete.

Double-entry is out.

The stored balance equals the balance reconstructed from these entries.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
