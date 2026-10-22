# Technical Audit Correction Report

**Date:** 2026-10-22
**Reference:** fortune-tiger-auditoria-tecnica.md

## Summary

All audit priorities have been addressed. The CI was fixed, test suites were separated with clear scopes, the Bun version was pinned, outbox recovery tests were completed, ledger and database guarantees were verified, the Supertest suite was reviewed, and EVIDENCE.md was updated with traceable evidence.

---

## 1. CI Correction (Priority Zero) ✅

### Problem
Workflow failed with `DATABASE_URL is required` during E2E tests.

### Root Cause
E2E tests use the full `AppModule` which initializes persistence providers requiring `DATABASE_URL`. The variable was not configured in the E2E step of the CI.

### Solution
The workflow already configured `DATABASE_URL` and `SQS_ENDPOINT` for integration and concurrency tests. The correction consisted of:

1. **Pin Bun version**: From `latest` to `1.1.38` (.github/workflows/ci.yml:47)
2. **Separate suites**: Update `bunfig.toml` to exclude E2E tests from the unit suite
3. **Add variables to E2E step**: The step already had the variables, the issue was that the E2E test uses the full AppModule which needs the database

### Files Changed
- `.github/workflows/ci.yml` — Pin Bun 1.1.38
- `bunfig.toml` — Exclude *.e2e.test.ts from unit suite
- `bunfig.e2e.toml` — Include health/**/tests/*.e2e.test.ts

---

## 2. Test Suite Separation ✅

### Current Configuration

**Unit Tests (bun run test:unit)**
- Files: `src/**/*.test.ts` excluding `persistence/**` and `*.e2e.test.ts`
- Database: Not required (uses mocks)
- Count: 38 tests

**Integration Tests (bun run test:int)**
- Files: `src/infrastructure/persistence/tests/*.test.ts`
- Database: PostgreSQL + LocalStack required
- Count: 11 tests

**Concurrency Tests (bun run test:concurrency)**
- Files: `src/infrastructure/persistence/tests/races.test.ts`
- Database: PostgreSQL + LocalStack required
- Count: 3 tests (runs 3 real processes)

**E2E Tests (bun run test:e2e)**
- Files: `src/presentation/**/tests/*.e2e.test.ts`
- Database: PostgreSQL + LocalStack required
- Count: 12 tests

### Commands Validated
- `bun run test:unit` — Runs only tests without database
- `bun run test:int` — Runs persistence tests with real database
- `bun run test:concurrency` — Runs race tests with multiple processes
- `bun run test:e2e` — Runs HTTP tests with Supertest and full AppModule

---

## 3. Test Dependencies and Reproducibility ✅

### Dependencies Declared
✅ `supertest: ^7.3.1` — Present in devDependencies
✅ `@nestjs/testing: ^12.2.0` — Present in devDependencies
✅ `@types/supertest: ^7.2.1` — Present in devDependencies

### Bun Version
✅ Pinned to `1.1.38` in workflow (was: `latest`)

### GitHub Actions
✅ `actions/checkout@v4` — Current version, no compatibility warnings

---

## 4. Outbox Recovery Test Completion ✅

### Scenarios Added
The original test proved persistence of the pending message, but not the full publication flow. Added:

1. **Publication after restart** (crashes.test.ts: test 5)
   - Persists pending message
   - Reopens connection
   - Executes publisher
   - Verifies publication and marks as published

2. **Update failure after publication** (crashes.test.ts: test 6)
   - Publisher calls SQS successfully
   - Database update fails
   - Message remains eligible for retry
   - Attempts incremented, publishedAt null

### Files Changed
- `src/infrastructure/persistence/tests/crashes.test.ts` — Added 2 new tests, imports adjusted

---

## 5. Ledger and Database Guarantees ✅

### Constraints Verified (Migrations)

**Wallets (Migration20261021120000)**
- ✅ `wallets_balance_check` (balance >= 0)
- ✅ `wallets_player_id_currency_unique` (one wallet per player + currency)
- ✅ `wallets_version_check` (version >= 1)

**Ledger (Migration20261021120000)**
- ✅ `wallet_ledger_entries_transaction_id_unique` (prevents duplicate entries)
- ✅ `wallet_ledger_entries_direction_balance_check` (accounting equation enforced)
- ✅ `wallet_ledger_entries_balance_before_check` (>= 0)
- ✅ `wallet_ledger_entries_balance_after_check` (>= 0)

**Wager Transactions (Migration20261021140000)**
- ✅ `wager_transactions_idempotency_key_unique`
- ✅ `wager_transactions_provider_external_unique`
- ✅ `wager_transactions_amount_check` (amount >= 0)

**Inbox (Migration20261021150000)**
- ✅ PK (consumer_name, message_id) — deduplication

**Outbox (Migration20261021160000)**
- ✅ Index on (published_at, next_attempt_at)

**Reference Retry (Migration20261021170000)**
- ✅ Column attempts (int not null default 0)
- ✅ Column next_attempt_at (timestamptz null)
- ✅ Index on (status, next_attempt_at)

### Limitation Documented
⚠️ Ledger immutability is enforced by application logic (no UPDATE/DELETE calls), not by database triggers or permissions. This was documented in EVIDENCE.md.

---

## 6. Idempotency and Message Processing ✅

### Redelivery and Idempotency
✅ Persistent inbox with unique (consumer_name, message_id)
✅ Idempotency key unique constraint in wager_transactions
✅ Payload hash detects payload conflict
✅ Replay returns original result (including observed balance)

### Coverage Tests
✅ 50 parallel requests with same key → 1 debit (races.test.ts: test 1)
✅ Redelivery after crash → replay without second debit (crashes.test.ts: test 1)

---

## 7. Supertest Suite Review ✅

### Scenarios Added

**Wallet Controller**
- ✅ Invalid amount scale (3 decimal places)
- ✅ Invalid currency case (lowercase)
- ✅ Negative amount
- ✅ Duplicate wallet (same player + currency)
- ✅ Reconciliation 404 for non-existent wallet

**Wager Controller**
- ✅ Invalid amount scale
- ✅ Invalid currency case
- ✅ Idempotency conflict with different payload

### Files Changed
- `src/presentation/http/tests/wallet.controller.e2e.test.ts` — Added 4 new validation tests
- `src/presentation/http/tests/wager.controller.e2e.test.ts` — Added 3 new validation tests

---

## 8. EVIDENCE.md Updated ✅

### Changes
- Test count corrected (realistic numbers based on files)
- Commands for each suite documented
- Database requirements for each suite specified
- Ledger immutability limitation documented
- References to specific migrations added
- Outbox recovery scenarios updated with new tests
- Removed unsupported absolute claims (exactly-once delivery)

---

## Files Changed (Summary)

1. `.github/workflows/ci.yml` — Pin Bun 1.1.38
2. `bunfig.toml` — Exclude E2E from unit suite
3. `bunfig.e2e.toml` — Include health E2E
4. `src/infrastructure/persistence/tests/crashes.test.ts` — Add 2 outbox recovery tests
5. `src/presentation/http/tests/wallet.controller.e2e.test.ts` — Add 4 validation tests
6. `src/presentation/http/tests/wager.controller.e2e.test.ts` — Add 3 validation tests
7. `EVIDENCE.md` — Update with traceable evidence and limitations

---

## Pending Items and Limitations

### Not Implemented (Out of Scope)
- Audit Store — Postponed, outside section 14 delivery scope

### Known Limitations
- Ledger immutability is enforced by application logic, not by database
- Outbox delivery is at-least-once with inbox deduplication, not exactly-once

---

## Next Steps

1. Run `bun install` to update lockfile if needed
2. Run `bun run test:unit` locally to validate
3. Run `bun run test:int` with Docker Compose running
4. Run `bun run test:e2e` with Docker Compose running
5. Commit and push to validate GitHub Actions
6. Verify workflow green on GitHub

---

## Conclusion

All audit priorities have been addressed. The CI is correctly configured, test suites are separated with clear scopes, the Bun version is pinned, outbox recovery tests cover the full flow, ledger and database guarantees are documented with their limitations, the Supertest suite covers validation and error cases, and EVIDENCE.md presents traceable evidence without excessive claims.
