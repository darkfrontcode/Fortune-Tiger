# Wager guards

A guard checks one rule. A guard that refuses throws; a guard that only answers returns a `boolean`. One concrete rule per class. Its method is `guard`; domain guards do not depend on application contracts.

The class name joins the concept, the subject, and the role: `WagerReferenceGuard`. The file is `kebab-case` with the role as a suffix: `wager-reference.guard.ts`. `index.ts` reexports the classes with `export *`, and callers import the folder. A guard is not reexported by `src/domain/wager/index.ts`.

The text comes from `data/`. The status table comes from `maps/transition.map.ts`; a guard that needs it holds its own `TransitionMap`.

| Guard | Input | Rule | Answer |
| --- | --- | --- | --- |
| `WagerReversalGuard` | `WagerTransactionKind` | the kind reverses another transaction (`REFUND`, `ROLLBACK`), so it carries a reference | `boolean` |
| `WagerReferenceGuard` | `WagerType.Reference` | a reversal kind carries a reference | throws `REFERENCE_REQUIRED_MESSAGE` |
| `WagerTerminalGuard` | `WagerTransactionStatus` | the status has no allowed transition | `boolean` |
| `WagerTransitionGuard` | `WagerType.Transition` | the move is allowed from the current status | throws `TERMINAL_STATUS_MESSAGE` when the status is terminal, and `STATUS_TRANSITION_MESSAGE` when the move is not in the map |

`WagerReferenceGuard` holds a `WagerReversalGuard`. `WagerTransitionGuard` holds a `WagerTerminalGuard` and a `TransitionMap`. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule, and each guard stays individual. A guard holds no optional field: the caller turns an absent reference into an empty string, and `WagerType.Reference` carries a `string`.

`WagerTransaction` holds one instance of each as a `const` at the top of `wager.ts`. `create` calls `WagerReferenceGuard`. `markProcessed`, `markPendingReference`, `reject`, and `fail` call `WagerTransitionGuard` through the private `move`. `isTerminal` answers through `WagerTerminalGuard`, and `requiresReference` answers through `WagerReversalGuard`.

The application asks the entity (`requiresReference`), not the guard: the use case does not import this folder.

Unit tests live in `tests/`, as `{subject}.guard.test.ts`, using the test-only `Theory` type and copy in `WHEN` / `SHOULD`.

All project text is English, including the root `README.md`.
