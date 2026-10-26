# Redis

`redis` runs the same `redis:7-alpine` image as compose and answers on the `redis` Service at `redis://redis:6379`. The API ConfigMap carries `REDIS_URL`, so both API replicas share the one cache.

Redis is an accelerator, never a source of truth. The wallet and wager read tokens wrap the SQL readers in a cache-aside that is fail-open in every direction: the cache stores nothing the financial path needs, and a missing or failing Redis falls through to PostgreSQL and changes no answer a provider receives. It stays out of `/health/ready` for the same reason. The cache is ephemeral by nature, so the pod uses no persistent volume: a restart clears it and the readers warm it again from the database.
