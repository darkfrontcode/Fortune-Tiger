# Pending todos

Work in progress. Check items off as they land.

## Application

- [ ] **Application layer refactor** — revisit folder shape and wiring across `transactions`, `reconciliations`, and `idempotencies` (barrels, types placement, gateway vs service boundaries). Today services are plain classes with constructor injection of protocols; when Nest boots, expect `@Injectable()` modules, providers for gateways/logger/metric, and removal of ad hoc `new` in tests where a test module fits. Do not block current phases on this, but treat the layout as provisional until HTTP and DI land.
- [ ] **Search application transactions** — implement the use case (query/list wager transactions in the application layer).

## Wager (`src/application/transactions/wager`)

- [ ] **Types location** — `TransactionsType` lives in `src/application/transactions/types.ts`; it belongs inside the wager folder (per concept-local `types.ts` convention).
- [ ] **File naming** — `wager.move.ts` and `wager.reference.ts` need clearer names aligned with project naming (role suffix, single responsibility).

## Infrastructure (`src/infrastructure/persistence`)

- [ ] **PersistenceHarness** (`__tests__/persistence.harness.ts`) — drop ad hoc table-name strings and raw `TRUNCATE` SQL; drive reset from MikroORM metadata or one shared source aligned with `persistence/spec.md` (all tables: `wallets`, `wallet_ledger_entries`, and later `wager_transactions`, `inbox_messages`, `outbox_messages`); keep truncate order / cascade consistent with migration FKs and entity `@ManyToOne` / `@OneToMany` relationships.
- [ ] **createOrm factory** (`orm.factory.ts`) — review URL resolution (`databaseUrl` vs `DATABASE_URL`), redundant locals (`fromParam` / `fromEnv` / `clientUrl`), and the `undefined` / empty-string guard; align naming and error handling with `persistence/data` and MikroORM config expectations.
