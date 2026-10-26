# Cache

This application capability owns the cache contract and its injection token. Infrastructure provides the Redis adapter. A read path that is stable and worth an extra hop receives its answer through the port rather than through a direct dependency on Redis.

`protocols/cache.protocol.ts` owns `CacheProtocol`, one read and one write:

```ts
interface CacheProtocol {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}
```

`get` returns the stored text, or nothing when the key is absent. `set` stores the text for `ttlSeconds`. The contract stays a string: the caller serializes and parses its own value, so the cache carries no domain type and no format.

`tokens/cache.token.ts` owns `CACHE`, one `Symbol`. The adapter in infrastructure binds the token with `useExisting`; the reader that caches injects only the token.

The cache is an optional accelerator, never a source of truth. A caller that cannot reach the store falls back to its own source and continues, because a cache miss or an outage must not change the answer a provider receives. The financial path never waits on the cache.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
