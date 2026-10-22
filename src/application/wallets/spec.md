# Wallets

This context owns the wallet-opening, wallet-reading, and ledger-reading ports and injection tokens used by application and HTTP consumers.

`WalletOpeningProtocol`, `WalletReaderProtocol`, and `LedgerReaderProtocol` live in `protocols/`. `LedgerPage`, `LedgerPageInput`, and `WalletOpeningInput` are part of those application contracts.

Each token has its own file in `tokens/`. `index.ts` reexports the token folder.

`OpenWalletUseCase`, `FindWalletUseCase`, and `ListWalletLedgerUseCase` own the wallet route operations. `FindWalletUseCase` and `ListWalletLedgerUseCase` throw `WalletNotFoundError` when the wallet is absent. This absence is an application query failure, not a domain rule. The error does not depend on Nest or HTTP.
