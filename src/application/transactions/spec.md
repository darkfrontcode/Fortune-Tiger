# Transactions

HTTP and the SQS consumer call this same use case.

One SQL transaction commits the wager, the wallet, the ledger, and the outbox. When the entry is the queue, the inbox row joins that same transaction. Publishing stays outside it.

The use case locks the wallet inside that transaction. See `src/infrastructure/persistence/spec.md`.

`OPENING` is not accepted here. A missing reference persists `PENDING_REFERENCE` and is retried by the scheduled worker described in `src/domain/wager/spec.md`.

A terminal wager is not applied again.

This use case decides which fact is recorded. `LOSS` records `WagerTransactionProcessed` and does not record `WalletBalanceChanged`. `WalletBalanceChanged` is recorded only when the balance changes. The envelope and the outbox row are in `src/infrastructure/messaging`.

## Wager

Wager mediation, strategies, and moves live in `wager/`. See `wager/spec.md`.

`WagerStrategyProtocol` lives in `src/application/protocols`.

A business failure rejects the wager. The balance, the version, and the ledger stay as they were. `WagerMediator.mediate` does not throw for a business failure.

`wager.service.ts` builds the wager, hashes the payload, rejects `OPENING`, and calls `WagerGatewayProtocol`. The adapter runs `WagerMediator` inside the SQL transaction. Unit tests live in `__tests__/` next to the file they cover, as `{subject}.spec.ts`.

`wager/types.ts` defines `TransactionsType` for submit, mediation, and reference holds.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
