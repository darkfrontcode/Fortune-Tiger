# Cache

The Redis adapter. `factories/redis.factory.ts` holds `RedisFactory`, which reads `Environment.redisUrl` and builds an `ioredis` client with `lazyConnect` through `create()`. `redis.cache.ts` holds `RedisCache`, the adapter for `CacheProtocol`: `get` returns the stored text or nothing, and `set` stores the text for a TTL. `readers/` holds the cached readers that wrap the SQL wallet and wager readers.

The adapter is fail-open. A Redis that is unreachable or errors on a read answers nothing instead of throwing, and a failed write is dropped; both log a warning and leave the caller to fall through to its source of truth. The cache is an optional accelerator, never a source of truth, and the financial path never waits on it.

`cache.module.ts` imports `EnvironmentModule` and `ObservabilityModule`, builds the client through `RedisFactory`, provides `RedisCache`, and binds `CACHE` with `useExisting`, exporting the token. `PersistenceModule` imports this module and binds the wallet and wager read tokens to the cached readers.

## Cached readers

`readers/cached-wallet.reader.ts` holds `CachedWalletReader` and `readers/cached-wager.reader.ts` holds `CachedWagerReader`. Each implements the read protocol of its concept, is `@Injectable()`, and receives the SQL reader by class, `CACHE` by token, and `LOGGER` and `METRIC` by token.

A read looks up the key in the cache. On a hit it parses and rehydrates the domain object, counts `cache_hits_total`, and answers without touching the database. On a miss or a value it cannot parse it counts `cache_misses_total`, reads through the SQL reader, and stores the serialized object with a TTL. A wallet is cached for 30 seconds, a wager for 60. An absent row stores nothing.

Both are fail-open in every direction: a Redis error, a malformed value, or a rehydration failure logs a warning and falls through to the SQL reader, so a cache outage never changes the answer a provider receives. The write path is untouched — the cached readers sit only behind the read tokens, and the `WAGER_GATEWAY`, `WALLET_OPENING`, and the writers never pass through the cache.

The key carries the aggregate id: `wallet:{id}`, `wager:{id}`, and `wager:provider:{providerId}:{externalTransactionId}`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
