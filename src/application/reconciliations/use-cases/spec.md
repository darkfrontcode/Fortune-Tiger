# Reconciliation use cases

`ReconcileWalletUseCase` loads the wallet and ledger snapshot through `ReconciliationGatewayProtocol`, compares the stored balance with the ledger, and reports divergence through the logger and metric protocols. If the wallet is absent, it throws `WalletReconciliationNotFoundError`, which the HTTP filter maps to the existing not-found response.
