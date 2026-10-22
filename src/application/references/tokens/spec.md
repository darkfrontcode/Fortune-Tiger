# Reference Tokens

`REFERENCE_GATEWAY` and `REFERENCE_READER` identify separate retry and read ports. `PersistenceModule` binds them to their persistence adapters.

Each token is a separate `Symbol` in its own file. `index.ts` reexports both with `export *`.
