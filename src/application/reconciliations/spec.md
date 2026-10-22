# Reconciliations

Compare the stored wallet balance with the balance reconstructed from the ledger. Do not repair a divergence.

Log it, count it in a metric, and return `walletId`, `storedBalance`, `calculatedBalance`, `difference`, `consistent`, and `checkedEntries`.

`ReconcileWalletUseCase` is `@Injectable()` and receives `RECONCILIATION_GATEWAY`, `LOGGER`, and `METRIC` by token. `LedgerBalancePattern` is a pure helper, so the use case builds it with `new`.

If the wallet is absent, the use case throws `WalletReconciliationNotFoundError`; the HTTP filter preserves the existing `404` response body.

`ReconciliationGatewayProtocol` lives in this context's `protocols/` folder, and `RECONCILIATION_GATEWAY` lives in `tokens/`. The cross-cutting `LoggerProtocol` and `MetricProtocol` and their `LOGGER` and `METRIC` tokens live in `application/observability`.

`reconciliations.module.ts` imports `PersistenceModule` and `ObservabilityModule`, provides `ReconcileWalletUseCase`, and exports it. The HTTP route calls that use case, and the metric counts divergence through `SimpleMetric`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
