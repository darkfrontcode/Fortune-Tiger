# Pending todos

Work in progress. Check items off as they land.

## Application

- [ ] **Application layer refactor** — revisit folder shape and wiring across `transactions`, `reconciliations`, and `idempotencies` (barrels, types placement, gateway vs service boundaries). Today services are plain classes with constructor injection of protocols; when Nest boots, expect `@Injectable()` modules, providers for gateways/logger/metric, and removal of ad hoc `new` in tests where a test module fits. Do not block current phases on this, but treat the layout as provisional until HTTP and DI land.
- [ ] **Search application transactions** — implement the use case (query/list wager transactions in the application layer).

## Wager (`src/application/transactions/wager`)

- [ ] **Types location** — `TransactionsType` lives in `src/application/transactions/types.ts`; it belongs inside the wager folder (per concept-local `types.ts` convention).
- [ ] **File naming** — `wager.move.ts` and `wager.reference.ts` need clearer names aligned with project naming (role suffix, single responsibility).

## Infrastructure (`src/infrastructure/persistence`)

- [ ] **WagerSubmitWriter** (`wager/wager-submit.writer.ts`) — class is growing (transaction boundary, idempotency replay, inbox, wallet lock, mediation, persist). Later: split into smaller collaborators (e.g. inbox receive/finish, idempotency short-circuit, persist orchestration) so the gateway adapter stays a thin bypass over one SQL `transactional`. Not urgent; inbox/outbox and consumer land first.
- [ ] **PersistenceHarness cleanup** (`__tests__/persistence.harness.ts`) — needs a proper pass. Today: hand-maintained `tables` array (easy to forget `inbox_messages` / `outbox_messages`), loose `TRUNCATE` SQL built with string join, no guard when `open()` fails (e.g. Postgres down → `afterAll` calls `close` on `undefined`). Refactor to one source of truth (MikroORM metadata or a list shared with `persistence/spec.md`), safer lifecycle for integration tests, and truncate order / cascade aligned with migration FKs. Not blocking feature work; schedule after the next persistence tables settle.
- [ ] **createOrm factory** (`orm.factory.ts`) — review URL resolution (`databaseUrl` vs `DATABASE_URL`), redundant locals (`fromParam` / `fromEnv` / `clientUrl`), and the `undefined` / empty-string guard; align naming and error handling with `persistence/data` and MikroORM config expectations.
