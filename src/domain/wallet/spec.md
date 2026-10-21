# Wallet

The private constructor receives a `schema`. Getters read the schema. `debit` and `credit` write the schema. There is no `_balance`. The guard is `wallet.guard.ts`. Error text is `data/messages.data.ts`. `data/index.ts` reexports it with `export *`.

Aggregate root. At most one wallet per `playerId` + `currency`. Balance is never negative. Every balance change has a ledger entry, and every ledger entry changes the balance. The operation currency equals the wallet currency.

`version` starts at 1 and increases only when the balance changes.

`open` creates. `rehydrate` rebuilds persisted state and does not revalidate a transition. The constructor is not public. `debit` and `credit` keep the balance and the ledger consistent with each other.

No lost update. The lock lives in `src/infrastructure/persistence/spec.md`. The unit of concurrency is `walletId`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
