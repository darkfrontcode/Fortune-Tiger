# Wallet protocols

`WalletReaderProtocol` reads one wallet by id. `WalletOpeningProtocol` opens a wallet with its player, initial balance, and opening time. `LedgerReaderProtocol` reads one cursor page for a wallet. The wallet use cases consume these ports; persistence implements them.

The input and output types describe only the application boundary. They do not expose ORM entities.
