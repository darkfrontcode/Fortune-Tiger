# 0015. Redis cache for reads

- Status: Accepted
- Date: 2026-10-26

## Context

A provider re-reads the same wallet and the same wager. The wallet and wager reads hit PostgreSQL on every request, and the ledger page, the reconciliation, and the financial write path already carry their own guarantees. The question is narrow: can the two read routes answer faster without changing the financial answer?

The sources of truth are set. PostgreSQL owns the wallet, the wager, and the ledger. The audit timeline and the journey are read models in MongoDB. The statement's score does not require a cache. A cache earns its place only on reads that repeat naturally, and it must never be the thing a balance depends on.

## Decision

Add Redis as a cache-aside in front of the wallet and wager readers only. `application/cache` owns `CacheProtocol` and the `CACHE` token. `infrastructure/cache` holds `RedisFactory` (`create()` builds an `ioredis` client from `Environment.redisUrl` with `lazyConnect`) and `RedisCache`, the fail-open adapter that `CacheModule` binds to `CACHE` with `useExisting`. `PersistenceModule` imports `CacheModule` and binds `WALLET_READER` to `CachedWalletReader` and `WAGER_READER` to `CachedWagerReader`, each wrapping the SQL reader.

- A read answers from `wallet:{id}`, `wager:{id}`, or `wager:provider:{providerId}:{externalTransactionId}` when the value parses; a miss reads through the SQL reader and stores it. A wallet lives 30 seconds, a wager 60.
- The compound key `wager:provider:` is a cache convenience: SQS FIFO and the unique `(provider_id, external_transaction_id)` keep the financial truth, and the cached key only mirrors a lookup.
- Fail-open in every direction. A Redis error, a malformed value, or a rehydration failure logs a warning and falls through to the SQL reader. The write path is untouched: `WAGER_GATEWAY`, `WALLET_OPENING`, and the writers never pass through the cache. The ledger page and the reconciliation stay out of the cache on purpose — the first is a paged read, the second compares the snapshot, and neither repeats through a single key.
- `cache_hits_total` and `cache_misses_total` count what the readers observe, exposed on `/metrics`. The cached readers live in `cache/readers`, not under `persistence/`, so the unit suite exercises them and the line coverage gate holds them.

## Consequences

- A wallet or wager read repeats without a second SQL query for the TTL. The financial path is unchanged: a bet still locks, writes, and commits against PostgreSQL, so a cache adds no correctness risk there.
- Redis is an accelerator, not a source of truth. A running Redis is not required by `/health/ready`, and an outage changes no answer a provider receives — the reader logs and falls through, and the cache warms again.
- The cache is ephemeral. A compose service, a CI service, and a single-replica cluster Deployment run the same `redis:7-alpine` image, and `cluster:verify` proves the hit counter moved after reading the same wallet twice.
- A stale value is bounded by the TTL and is never a financial authority: a cache can serve a moment-old balance, and a wallet read (not a write) is what it accelerates.
- The pipeline carries Redis as a service in CI and the cluster the same way, so the two supported deployments (compose and kind) match the local `.env` default.
