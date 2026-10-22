# Wallet use cases

`OpenWalletUseCase` opens a wallet through `WalletOpeningProtocol` and obtains its opening time from `ClockProtocol`.

`FindWalletUseCase` reads a wallet through `WalletReaderProtocol` and throws `WalletNotFoundError` when absent.

`ListWalletLedgerUseCase` verifies the wallet through `WalletReaderProtocol`, then reads its page through `LedgerReaderProtocol`. It throws `WalletNotFoundError` when the wallet is absent.

These use cases do not depend on HTTP or persistence adapters.
