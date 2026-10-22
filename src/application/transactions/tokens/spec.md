# Transaction Tokens

`WAGER_GATEWAY` and `WAGER_READER` identify the wager submission and query ports. `PersistenceModule` binds them to their persistence adapters.

Each token is a separate `Symbol` in its own file. `index.ts` reexports both with `export *`.
