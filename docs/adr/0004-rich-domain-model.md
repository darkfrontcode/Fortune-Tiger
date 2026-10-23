# 0004. Model money, wallet, ledger, and wager as a rich domain

- Status: Accepted
- Date: 2026-10-23

## Context

The rules are financial and easy to state: a balance never goes negative, a debit always has a ledger entry, a reversal points at one processed transaction and happens once, and a `LOSS` moves no money. A service that mutates public fields can satisfy any of those until someone writes the wrong line.

The statement's skeleton uses underscored fields and setters. Section 6 allows a different signature when the guarantee holds.

## Decision

Each concept owns its state in a `schema` received by a private constructor.

- `Money` is a value object. It is immutable, holds a `Decimal` and a currency, and every operation returns another instance. The amount arrives and leaves as a two-place string.
- `Wallet` is an entity. It opens, rehydrates, debits, and credits, and it raises `version` only when the balance changes.
- `WalletLedgerEntry` is immutable after `create`. It answers whether it is balanced and refuses an entry whose direction does not move the opening balance to the closing one.
- `WagerTransaction` is an entity with an explicit transition map. `PENDING`, `PENDING_REFERENCE`, `PROCESSED`, `REJECTED`, and `FAILED` follow the table, and a terminal status throws on a move.

A rule that refuses lives in a guard, one rule per class, and a composite guard holds the guards it composes instead of restating them. A rule that matches text lives in a pattern. A concept holds one instance of each as a `const` at the top of its file. Types of a concept live in one namespace in `types.ts`, and the error text lives in `data/messages.data.ts` as `UPPER_SNAKE_CASE` constants.

The ledger is single-entry per wallet. Double-entry is out, because the challenge is a wallet ledger, not a general ledger, and a second side would add accounts nobody reads.

## Consequences

- `wager.reject(code)` cannot leave the status untouched, and `wallet.debit(money)` cannot pass a rule that lives in the guard.
- `rehydrate` rebuilds persisted state without replaying transitions, so a stored history loads in one step.
- The model is small and dense. A reader who wants the whole rule reads four files, not a service tree.
- Guards are classes, which is more ceremony than free functions; the trade is a documented single rule with its own spec and its own test.
