# Pending todos

Work in progress. Check items off as they land.

## Application

- [ ] **Search application transactions** — implement the use case (query/list wager transactions in the application layer).

## Wager (`src/application/transactions/wager`)

- [ ] **Types location** — `TransactionsType` lives in `src/application/transactions/types.ts`; it belongs inside the wager folder (per concept-local `types.ts` convention).
- [ ] **File naming** — `wager.move.ts` and `wager.reference.ts` need clearer names aligned with project naming (role suffix, single responsibility).

## Infrastructure (`src/infrastructure/persistence`)

- [ ] **PersistenceHarness** (`__tests__/persistence.harness.ts`) — drop ad hoc table-name strings and raw `TRUNCATE` SQL; drive reset from MikroORM metadata or one shared source aligned with `persistence/spec.md` (all tables: `wallets`, `wallet_ledger_entries`, and later `wager_transactions`, `inbox_messages`, `outbox_messages`); keep truncate order / cascade consistent with migration FKs and entity `@ManyToOne` / `@OneToMany` relationships.
- [ ] **createOrm factory** (`orm.factory.ts`) — review URL resolution (`databaseUrl` vs `DATABASE_URL`), redundant locals (`fromParam` / `fromEnv` / `clientUrl`), and the `undefined` / empty-string guard; align naming and error handling with `persistence/data` and MikroORM config expectations.
