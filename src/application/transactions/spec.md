# Transactions

HTTP and the SQS consumer call this same use case.

One SQL transaction commits the wager, the wallet, the ledger, and the outbox. When the entry is the queue, the inbox row joins that same transaction. Publishing stays outside it.

The use case locks the wallet inside that transaction. See `src/infrastructure/persistence/spec.md`.

`OPENING` is not accepted here. A missing reference persists `PENDING_REFERENCE` and is retried by the scheduled worker described in `src/domain/wager/spec.md`.

A terminal wager is not applied again.

This use case decides which fact is recorded. `LOSS` records `WagerTransactionProcessed` and does not record `WalletBalanceChanged`. `WalletBalanceChanged` is recorded only when the balance changes. The envelope and the outbox row are in `src/infrastructure/messaging`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
