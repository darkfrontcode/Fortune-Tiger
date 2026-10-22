# Wallets

This context owns the wallet-opening, wallet-reading, and ledger-reading injection tokens used by application and HTTP consumers.

Each token has its own file in `tokens/`. `index.ts` reexports the token folder.

`OpenWalletUseCase`, `FindWalletUseCase`, and `ListWalletLedgerUseCase` own the wallet route operations. `FindWalletUseCase` and `ListWalletLedgerUseCase` throw `WalletNotFoundError` when the wallet is absent. This absence is an application query failure, not a domain rule. The error does not depend on Nest or HTTP.
