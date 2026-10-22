# Idempotency guards

A guard checks one rule. A guard that refuses throws; a guard that only answers returns a `boolean`. One rule per class. Every class here implements `GuardProtocol` from `application/protocols`, and the protocol method is `guard`.

The class name joins the concept, the subject, and the role: `IdempotencyHashGuard`. The file is `kebab-case` with the role as a suffix: `idempotency-hash.guard.ts`. `index.ts` reexports the classes with `export *`, and the folder barrel reexports it.

| Guard | Input | Rule | Answer |
| --- | --- | --- | --- |
| `IdempotencyHashGuard` | `IdempotencyType.Hash` | the incoming payload hash equals the stored one | `boolean` |

`IdempotencyService` holds one instance as a `private readonly` property. `outcome` calls it before replaying the stored result or reporting `IDEMPOTENCY_PAYLOAD_CONFLICT`. A different hash is not a replay, and a new key is not a duplicate. A guard may hold other guards inside when the rule is composed: it asks the inner guard instead of repeating the inner rule, and each guard stays individual.

Unit tests live in `__tests__/`, as `{subject}.guard.spec.ts`, in the `TheoryProtocol` shape, with copy in `WHEN` / `SHOULD`.

All project text is English, including the root `README.md`.
