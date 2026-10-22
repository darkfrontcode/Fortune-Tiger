# Wallet Tokens

`LEDGER_READER`, `WALLET_OPENING`, and `WALLET_READER` identify separate wallet and ledger ports. `PersistenceModule` binds them to their persistence adapters.

Each token is a separate `Symbol` in its own file. `index.ts` reexports them with `export *`.
