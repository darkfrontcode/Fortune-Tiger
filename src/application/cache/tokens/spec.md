# Tokens

`cache.token.ts` owns `CACHE`, one `Symbol` per file. `index.ts` reexports it with `export *`. The owning module binds the token with `useExisting`; the reader that caches injects only the token.
