# Protocols

`cache.protocol.ts` owns `CacheProtocol`. It is a pure contract with no runtime value. The adapter in `infrastructure/cache` implements it and is bound to `CACHE` with `useExisting`, so the reader that caches injects only the token.
