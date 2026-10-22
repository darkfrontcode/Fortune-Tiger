# Transactions

HTTP and the SQS consumer call this same use case.

One SQL transaction commits the wager, the wallet, the ledger, and the outbox. When the entry is the queue, the inbox row joins that same transaction. Publishing stays outside it.

The use case locks the wallet inside that transaction. See `src/infrastructure/persistence/spec.md`.

`OPENING` is not accepted here. A missing reference persists `PENDING_REFERENCE` and is retried by `RetryReferencesUseCase` in `src/application/references`. The retry state and the backoff are in `src/domain/wager/spec.md`.

A terminal wager is not applied again.

This use case decides which fact is recorded. `LOSS` records `WagerTransactionProcessed` and does not record `WalletBalanceChanged`. `WalletBalanceChanged` is recorded only when the balance changes. The envelope and the outbox row are in `src/infrastructure/messaging`.

## Wager

Wager mediation, strategies, and moves live in `wager/`. See `wager/spec.md`.

`WagerStrategyProtocol` lives in `src/application/protocols`.

`WAGER_GATEWAY` and `WAGER_READER` live in this context's `tokens/` folder.

A business failure rejects the wager. The balance, the version, and the ledger stay as they were. `WagerMediator.mediate` does not throw for a business failure.

`wager/use-cases/submit-wager.use-case.ts` builds the wager, hashes the payload, rejects `OPENING`, and calls `WagerGatewayProtocol`. The adapter runs `WagerMediator` inside the SQL transaction. HTTP and the queue use this same case. Read routes use one case each in `wager/use-cases/`.

`wager/use-cases/find-wager.use-case.ts` and `find-wager-by-provider.use-case.ts` own the wager read routes. `wager/types.ts` defines `TransactionsType` for submit, mediation, and reference holds.

## Module

`transactions.module.ts` imports `PersistenceModule` and `IdempotenciesModule`, provides the wager use cases, and exports them. `SubmitWagerUseCase` is `@Injectable()` and receives `WAGER_GATEWAY` by token and `IdempotencyService` by class. The use cases import protocols, never `WagerSubmitWriter`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
