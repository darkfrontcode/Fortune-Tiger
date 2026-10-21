# Wager

Mediation, strategies, and wallet moves for one `WagerTransaction` inside the transactions use case.

`mediators/wager.mediator.ts` defines `WagerMediator.mediate`. `WagerReference` and `WagerMove` sit in this folder. One strategy per `WagerTransactionKind` sits in `strategies/`. `WagerStrategy.from` picks the strategy.

Application error text for a missing strategy lives in `data/messages.data.ts`.

Unit tests live in `__tests__/` next to the module they cover. `mediators/__tests__/wager.mediator.spec.ts` covers `WagerMediator`.

`TransactionsType` lives in the parent folder (`../types.ts`). The Nest entry `wager.service.ts` will live there too.
