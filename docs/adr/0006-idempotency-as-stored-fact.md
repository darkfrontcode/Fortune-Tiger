# 0006. Make idempotency a stored fact

- Status: Accepted
- Date: 2026-10-23

## Context

A provider retries on a timeout, and the retry may carry the same request or a corrected one. The server cannot tell the two apart from the transport, and an in-memory cache dies with the process and disagrees across instances.

## Decision

The `Idempotency-Key` header is required on `POST /wagering/transactions`, and the queue reads `idempotencyKey` from `data`. The row stores the key, a payload hash, and the result that was returned.

The hash is SHA-256 over a canonical JSON document: business fields only, keys sorted at every object level, `money` serialised as `{ amount, currency }` at the same scale, and `referenceExternalTransactionId` omitted when it is absent. The digest is lowercase hex.

Three outcomes follow from the stored row:

- Same key and same hash: the original result returns, with the balance observed at that processing, and `idempotentReplay: true`.
- Same key and a different hash: `409` with `IDEMPOTENCY_PAYLOAD_CONFLICT`. It is not a replay.
- No row: the operation runs, and the unique key means a concurrent duplicate hits the constraint instead of producing a second debit.

A concurrent insert on the key reopens the stored row and answers replay or conflict. The raw constraint error never leaves the writer.

## Consequences

- Fifty parallel copies of one bet produce one debit and forty-nine replays.
- A replay returns the balance of that moment, not the current balance, so the answer is stable.
- The key is the provider's promise. Two different operations that share a key are a conflict by design.
- Changing a business field changes the hash, so a retry with a corrected payload is rejected instead of silently applied. The provider must use a new key.
