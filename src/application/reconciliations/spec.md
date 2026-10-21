# Reconciliations

Compare the stored wallet balance with the balance reconstructed from the ledger. Do not repair a divergence.

Log it, count it in a metric, and return `walletId`, `storedBalance`, `calculatedBalance`, `difference`, `consistent`, and `checkedEntries`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
