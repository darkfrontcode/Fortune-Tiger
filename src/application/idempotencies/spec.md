# Idempotencies

The same operation, repeated by timeout, retry, or duplicate delivery, does not produce another financial effect.

The `Idempotency-Key` header is the source of truth and is required on HTTP. Recommended shape: `{providerId}:{externalTransactionId}`. The queue sends `idempotencyKey` in `data`. Uniqueness also holds on `(providerId, externalTransactionId)`.

No in-memory cache. The evidence lives in Postgres, behind a unique constraint.

SHA-256 of a canonical JSON document, keys sorted, business fields only:

`providerId`, `externalTransactionId`, `playerId`, `walletId`, `roundId`, `gameId`, `kind`, `money`, `referenceExternalTransactionId`.

The header and the transport stay out.

Same key and same `payloadHash`: return the original result, with the balance observed at that processing, and `idempotentReplay: true`.

Same key and a different hash: conflict, `IDEMPOTENCY_PAYLOAD_CONFLICT`. That is not a replay. The HTTP status is in `src/presentation/http/spec.md`.

The same bet 50 times in parallel produces a single debit. A simultaneous duplicate hits the constraint, not two balance updates.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
