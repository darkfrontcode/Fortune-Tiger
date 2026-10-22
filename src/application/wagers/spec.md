# Wagers

HTTP and the SQS consumer call the same wager use cases.

One SQL transaction commits the wager, wallet, ledger, inbox when the entry is the queue, and outbox. Publishing stays outside it. The wager gateway performs the transaction and locks the wallet. See `src/infrastructure/persistence/spec.md`.

`OPENING` is not accepted by wager submission. A missing reference persists `PENDING_REFERENCE` and is retried by `RetryReferencesUseCase` in `src/application/references`. A terminal wager is not applied again.

The use case decides which fact is recorded. `LOSS` records `WagerTransactionProcessed` and does not record `WalletBalanceChanged`. `WalletBalanceChanged` is recorded only when the balance changes. The event envelope and outbox row are in `src/infrastructure/messaging`.

`WagerMediator` applies the strategy for one transaction kind. Strategies live in `strategies/` and implement `WagerStrategyProtocol` from `protocols/`. `WagerReference` and `WagerMove` are pure wager helpers. `ReferenceMediator` schedules a retry while the reference is absent or nonterminal, rejects an exhausted wager, and delegates terminal references to `WagerMediator`.

`use-cases/submit-wager.use-case.ts` builds the wager, hashes the payload, rejects `OPENING`, and calls `WagerGatewayProtocol`. The persistence adapter runs `WagerMediator` inside the SQL transaction. HTTP and the queue use this same case. Read routes each have their own use case in `use-cases/`.

`WagerGatewayProtocol` and `WagerReaderProtocol` live in `protocols/`; `WAGER_GATEWAY` and `WAGER_READER` live in `tokens/`. The use cases import ports, never persistence adapters. `WagersType` in `types.ts` defines submit, mediation, and reference-hold shapes.

`wagers.module.ts` imports `PersistenceModule` and `IdempotenciesModule`, provides the wager use cases, and exports them. The use cases receive ports by token and `IdempotencyService` by class.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
