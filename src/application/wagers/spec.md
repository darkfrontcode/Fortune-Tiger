# Wagers

HTTP and the SQS consumer call the same wager use cases.

One SQL transaction commits the wager, wallet, ledger, inbox when the entry is the queue, and outbox. Publishing stays outside it. The wager gateway performs the transaction and locks the wallet. See `src/infrastructure/persistence/spec.md`.

`OPENING` is not accepted by wager submission. A missing reference persists `PENDING_REFERENCE` and is retried by `RetryReferencesUseCase` in `src/application/references`. A terminal wager is not applied again.

The use case decides which fact is recorded. `LOSS` records `WagerTransactionProcessed` and does not record `WalletBalanceChanged`. `WalletBalanceChanged` is recorded only when the balance changes. The event envelope and outbox row are in `src/infrastructure/messaging`.

`WagerMediator` applies the strategy for one transaction kind. The main strategy, `WagerStrategy`, sits at the root of `strategies/` and answers one shared instance from a `Map` keyed by `kind`, so one kind is never resolved by a chain of `if`s and no kind builds a new strategy per call. The concrete kinds live in `strategies/options/`: `bet.option.ts`, `opening.option.ts`, `refund.option.ts`, `rollback.option.ts`, `win.option.ts`, and `loss.option.ts`, with the classes `BetOption`, `OpeningOption`, `RefundOption`, `RollbackOption`, `WinOption`, and `LossOption`. Every option implements `WagerStrategyProtocol` from `protocols/` and carries its `kind`. `WagerMovesService` and `WagerReferencesService` live in `services/`; both are `@Injectable()`, the options receive the moves service in the constructor, and `WagerMediator` receives the references service and the strategy. `ReferenceMediator` schedules a retry while the reference is absent or nonterminal, rejects an exhausted wager, and delegates terminal references to `WagerMediator`.

`use-cases/submit-wager.use-case.ts` builds the wager, hashes the payload, rejects `OPENING`, and calls `WagerGatewayProtocol`. It counts the result by its final status, counts a replay, and observes the processing duration, always with the names from `application/observability/data`. The persistence adapter runs `WagerMediator` inside the SQL transaction. HTTP and the queue use this same case. Read routes each have their own use case in `use-cases/`.

`WagerGatewayProtocol` and `WagerReaderProtocol` live in `protocols/`; `WAGER_GATEWAY` and `WAGER_READER` live in `tokens/`. The use cases import ports, never persistence adapters. `WagersType` in `types.ts` defines submit, mediation, and reference-hold shapes.

`wagers.module.ts` imports `PersistenceModule`, `IdempotenciesModule`, and `ObservabilityModule`, provides the wager use cases, and exports them. The use cases receive ports by token, `IdempotencyService` by class, and `METRIC` and `CLOCK` by token. `PersistenceModule` provides `WagerMovesService`, `WagerReferencesService`, and `WagerStrategy` beside `WagerMediator`, because the SQL adapter calls the mediator and `PersistenceModule` cannot import `WagersModule` without a cycle.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
