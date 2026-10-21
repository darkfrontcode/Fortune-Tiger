# Wager

Mediation, strategies, and wallet moves for one `WagerTransaction` inside the transactions use case.

`mediators/wager.mediator.ts` defines `WagerMediator.mediate`. `WagerReference` and `WagerMove` sit in this folder. One strategy per `WagerTransactionKind` sits in `strategies/`. `WagerStrategy.from` picks the strategy.

`mediators/reference.mediator.ts` defines `ReferenceMediator.retry` for a waiting wager. It schedules a retry while the reference is absent or not terminal, rejects when `exhausted()` is true, and delegates to `WagerMediator.mediate` once the reference is terminal.

Application error text for a missing strategy lives in `data/messages.data.ts`.

Unit tests live in `__tests__/` next to the module they cover. `mediators/__tests__/wager.mediator.spec.ts` covers `WagerMediator`. `mediators/__tests__/reference.mediator.spec.ts` covers `ReferenceMediator`.

`types.ts` defines `TransactionsType`. `wager.service.ts` is the Nest entry for this use case.
