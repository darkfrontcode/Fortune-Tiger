# Wallet use cases

`FindWalletUseCase` receives a wallet ID and reads the wallet through `WalletReaderProtocol`. It returns the wallet when found and throws `WalletNotFoundError` when absent. It does not depend on HTTP or persistence adapters.
