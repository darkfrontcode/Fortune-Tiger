# Wager

The challenge names this type `WagerTransaction`. The folder is `wager`. The class keeps that name. Enums live in `enums/`: `wager-transaction-kind.enum.ts`, `wager-transaction-status.enum.ts`, and `failure-code.enum.ts`. `enums/index.ts` reexports them with `export *`. Error text is `data/messages.data.ts`. The status table is `maps/transition.map.ts`, a class that extends `Map`. The guard is `wager.guard.ts`.

The private constructor receives a `schema`. Getters read the schema. `markProcessed`, `reject`, and the other transitions write the schema. There is no `_status`.

Born `PENDING`.

- `PENDING` → `PENDING_REFERENCE` | `PROCESSED` | `REJECTED` | `FAILED`
- `PENDING_REFERENCE` → `PROCESSED` | `REJECTED` | `FAILED`
- `PROCESSED`, `REJECTED`, and `FAILED` do not change. Trying to change them is a programming error.
- `REJECTED` is a business-rule violation.
- `FAILED` is a permanent infrastructure error. It stays auditable. It is not a business rejection.

`OPENING` is internal. The API and the queue cannot submit it.

| Kind | Balance | Ledger | Rule |
| --- | --- | --- | --- |
| `OPENING` | credit | `CREDIT` | internal use case only, in the same SQL transaction as opening, when the initial balance is above zero |
| `BET` | debit | `DEBIT` | insufficient balance → `REJECTED` `INSUFFICIENT_FUNDS` |
| `WIN` | credit | `CREDIT` | a `BET` reference in the same round is optional |
| `LOSS` | none | none | publishes `WagerTransactionProcessed` and does not publish `WalletBalanceChanged` |
| `REFUND` | credit | `CREDIT` | one `PROCESSED` `BET`, once, same amount |
| `ROLLBACK` | inverse | one inverted entry | one `PROCESSED` `BET`, `WIN`, or `REFUND`, once |

`LOSS` does not affect the balance. `REFUND` and `ROLLBACK` require a reference.

`REFUND` and `ROLLBACK` require `referenceExternalTransactionId`. The reference is `(providerId, referenceExternalTransactionId)` and the same provider, player, wallet, currency, and round.

`REFUND` points only at `BET`. `ROLLBACK` points at `BET`, `WIN`, or `REFUND`. The same kind does not reverse the same reference twice. The amount equals the reference amount. Partial reversal is out.

A reversal that would leave a negative balance → `REJECTED` `REVERSAL_INSUFFICIENT_FUNDS`. It does not use the insufficient-bet code.

A reference that is still missing → `PENDING_REFERENCE`. Worker every 2 seconds. Backoff `1s × 2^n`, cap 60s, 12 attempts. Exhausted → `REJECTED` `REFERENCE_NOT_FOUND` and `WagerTransactionPendingReference`.

Replay returns the balance observed at that processing (`observedBalance` on the wager or the ledger), not the current balance.

`create` starts at `PENDING` and checks whether the kind requires a reference. `rehydrate` does not revalidate transitions.

## failureCode

The wager carries a stable machine-readable `failureCode`. The provider uses it to decide whether to resend, fix the payload, or stop.

`INSUFFICIENT_FUNDS`, `REVERSAL_INSUFFICIENT_FUNDS`, `CURRENCY_MISMATCH`, `WALLET_NOT_FOUND`, `PLAYER_WALLET_MISMATCH`, `INVALID_KIND`, `INVALID_REFERENCE_KIND`, `REFERENCE_NOT_FOUND`, `REFERENCE_ALREADY_REVERSED`, `REFERENCE_AMOUNT_MISMATCH`, `REFERENCE_SCOPE_MISMATCH`, `IDEMPOTENCY_PAYLOAD_CONFLICT`, `OPENING_NOT_ALLOWED`, `NEGATIVE_AMOUNT`, `INVALID_MONEY`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
