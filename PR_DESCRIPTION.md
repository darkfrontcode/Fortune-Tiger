# Enforce Ledger Integrity at the Database Boundary

## 📋 Description

This PR closes the remaining integrity gap in the wallet ledger by enforcing immutable ledger rows and valid transaction references at the PostgreSQL boundary. It adds database-level validation for wallet, transaction, and currency identity, updates repository fixtures to satisfy the stronger relational contract, and records the verified coverage and full-stack results for reviewers.

## ✨ Changes

### Ledger Integrity

- 🔒 Added a foreign key from ledger entries to wager transactions.
- 🔒 Added PostgreSQL validation for wallet, transaction, and currency consistency.
- 🔒 Added database triggers that reject direct ledger updates and deletes.
- ✅ Added integration tests proving mutation and orphan-reference attempts are rejected.

### Persistence Tests

- 🔄 Updated wallet ledger repository fixtures to persist valid parent wager transactions.
- ✅ Preserved repository ordering and lookup coverage under the stricter schema contract.

### Documentation and Quality Evidence

- 📝 Updated persistence specifications, evaluation notes, and the evidence matrix.
- 📝 Documented the Bun coverage behavior and kept the enforced executable-line gate at 100%.
- ✅ Updated the README coverage badge to reflect the verified line coverage.

## 🔧 Technical Details

### Database Changes

The new migration adds a foreign key for ledger transaction ownership, a validation trigger for wallet and currency identity, and an immutability trigger that rejects updates and deletes. The migration rollback removes these database objects in reverse dependency order.

### Verification

The complete local gate passed with Docker Compose: 367 unit tests, 51 persistence integration tests, six multi-process concurrency tests, 47 HTTP end-to-end tests, TypeScript build validation, and migration checks. Unit line coverage is 100%; Bun's function metric is documented separately because it counts implicit class constructors.

## 📦 Dependencies

- No new dependencies added.
- Uses the existing PostgreSQL, MikroORM, Bun test, and LocalStack infrastructure.
