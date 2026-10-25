# Wallet data

`wallet.data.ts` holds `platformProvider`, the provider that opens a wallet. A wallet is opened by the platform, not by a gaming provider, so the `OPENING` transaction and every stage of that flow carry this provider.

The constant lives here because both layers need it: the use case records the journey step, and the persistence writer builds the `OPENING` transaction. The infrastructure imports the application constant instead of repeating the literal.

`index.ts` reexports the file with `export *`.
