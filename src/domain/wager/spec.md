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

A reference that is still missing → `PENDING_REFERENCE`.

`markPendingReference()` sets `attempts` to 0 and leaves `nextAttemptAt` absent. The initial submit is not counted as an attempt. The first retry is due on the next worker tick.

The worker runs every 2 seconds and loads `PENDING_REFERENCE` rows whose `nextAttemptAt` is absent or not after now. For each row, a missing reference calls `scheduleRetry(now)`. It increments `attempts` and sets `nextAttemptAt` to `now + 1s × 2^(attempts - 1)`, capped at 60 seconds. `attempts` counts worker retries. `exhausted()` is true when `attempts` reaches 12. The 12th missing retry rejects with `REFERENCE_NOT_FOUND`. `PROCESSED`, `REJECTED`, and `FAILED` clear `nextAttemptAt`.

The pending event is recorded on the first transition to `PENDING_REFERENCE`. A retry that is still missing does not record it again. Exhaustion records `WagerTransactionRejected`.

`scheduleRetry` throws when the status is not `PENDING_REFERENCE`.

Replay returns the balance observed at that processing (`observedBalance` on the wager or the ledger), not the current balance.

`create` starts at `PENDING` and checks whether the kind requires a reference. `rehydrate` does not revalidate transitions.

Applying a kind to a wallet and a ledger lives in `src/application/transactions/spec.md` (`WagerMediator` and strategies). The retry decision lives in `ReferenceMediator`, in `src/application/references/spec.md`. This folder keeps the entity, the guard, the retry state, and the maps.

## failureCode

The wager carries a stable machine-readable `failureCode`. The provider uses it to decide whether to resend, fix the payload, or stop.

`INSUFFICIENT_FUNDS`, `REVERSAL_INSUFFICIENT_FUNDS`, `CURRENCY_MISMATCH`, `WALLET_NOT_FOUND`, `PLAYER_WALLET_MISMATCH`, `INVALID_KIND`, `INVALID_REFERENCE_KIND`, `REFERENCE_NOT_FOUND`, `REFERENCE_ALREADY_REVERSED`, `REFERENCE_AMOUNT_MISMATCH`, `REFERENCE_SCOPE_MISMATCH`, `IDEMPOTENCY_PAYLOAD_CONFLICT`, `OPENING_NOT_ALLOWED`, `NEGATIVE_AMOUNT`, `INVALID_MONEY`.

Unit tests live in `__tests__/wager.spec.ts`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
