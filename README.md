# 🐯 Fortune Tiger

Wager processor. Balance, ledger, and a repeated operation stay correct.

<p>
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.x-000000?style=for-the-badge&logo=bun&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="MikroORM" src="https://img.shields.io/badge/MikroORM-2F6B4F?style=for-the-badge" />
  <img alt="SQS" src="https://img.shields.io/badge/SQS-LocalStack-FF9900?style=for-the-badge&logo=amazonsqs&logoColor=white" />
</p>

A provider sends a bet, a win, a loss, a refund, and a rollback. The wallet stays at zero or above. Every balance change has a ledger entry. The same key does not move the balance again.

## Folders

- 🎯 **domain** — the rule
- ⚙️ **application** — the use case
- 🗄️ **infrastructure** — database, queue, and log
- 🌐 **presentation** — HTTP

`src` has these four folders. `src/main.ts` boots Nest. `src/app.module.ts` wires them. A plug-in contract lives in `protocols`, inside application or infrastructure.

This file follows each phase as it lands.

<details>
<summary>🎯 Domain</summary>

`money`, `wallet`, `ledger`, and `wager`.

`money` is in place. The amount is a decimal string with scale 2. `from` and `zero` build it. `decimal.js` does the math. A different currency throws.

`wallet` is in place. `open` starts `version` at 1. `debit` and `credit` write the balance. A debit that would pass below zero throws. `version` increases only when the balance changes. `rehydrate` rebuilds and does not revalidate.

`ledger` is in place. `create` keeps a debit or a credit only when `balanceBefore` and `money` produce `balanceAfter`. A debit subtracts. A credit adds. `rehydrate` rebuilds and does not recheck. The entry does not update or delete.

`wager` is in place. `WagerTransaction` is born `PENDING`. It can move to `PENDING_REFERENCE`, `PROCESSED`, `REJECTED`, or `FAILED`. `PENDING_REFERENCE` can move to `PROCESSED`, `REJECTED`, or `FAILED`. A terminal status does not change. `reject` and `fail` store a `failureCode`. `create` requires a reference for `REFUND` and `ROLLBACK`. `rehydrate` rebuilds and does not recheck. `PENDING_REFERENCE` carries `attempts` and `nextAttemptAt`; the backoff is `1s × 2^(attempts - 1)`, capped at 60 seconds, and the 12th missing retry rejects with `REFERENCE_NOT_FOUND`.

An entity has an `id`. A value object has no `id` and is compared by value. The folder is the concept, and the file is the concept: `ledger/ledger.ts`. `entities/` and `values/` appear inside a concept only when that concept needs both.

The private constructor receives a `schema`. A getter reads it. A rule method writes it. Types of a concept live in `types.ts`, in a namespace `{Concept}Type`.

</details>

<details>
<summary>⚙️ Application</summary>

- `transactions` — `WagerService` hashes the payload and calls `WagerGatewayProtocol`. `WagerMediator` and strategies run inside the SQL transaction (`WagerSubmitWriter`). HTTP and the queue call the same service.
- `references` — `ReferenceService` retries a `PENDING_REFERENCE` wager with backoff and stops after 12 attempts.
- `reconciliations` — `reconciliation.service.ts` compares the wallet with the ledger.
- `idempotencies` — `idempotency.service.ts` hashes the canonical business payload. `outcome` replays with `observedBalance`, or returns `IDEMPOTENCY_PAYLOAD_CONFLICT` when the key repeats with a different body.

One word, plural, no hyphen in the middle of the name.

</details>

<details>
<summary>🗄️ Infrastructure</summary>

- `persistence` — MikroORM, schema, and the wallet lock
- `messaging` — queue, inbox, outbox, the publisher, the consumer, and the event envelope
- `observability` — `SimpleLogger`, `ClockProtocol`, and metrics
- `protocols` — `TheoryProtocol`, the contract a unit theory plugs in

`persistence` is in place for `wallets` and `wallet_ledger_entries`. Migrations are versioned and reversible. Money columns are `numeric(20, 2)` with `currency char(3)`. `migration:*` reads `DATABASE_URL`.

`observability` is in place for `SimpleLogger` and `SystemClock`. A child logger attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. The line is JSON, or pretty when `open` receives `pretty`; the Nest adapter will read `LOG_PRETTY`. No financial payload enters the log.

`messaging` is in place for the event envelope, the inbox, the outbox, the publisher, and the consumer. `OutboxPublisher` claims due rows with `FOR UPDATE SKIP LOCKED`, and `SqsPublisher` sends them to `wager-transactions.fifo` with the aggregate as the message group and the event id as the deduplication id. A failed send schedules the row for retry. `SqsConsumer` long-polls the main queue; `WagerConsumer` parses the request, calls `WagerService` with the inbox row, and acks after the commit. A business failure is acked, a transient failure retries with backoff, and the fifth receive or a malformed request goes to `wager-transactions-dlq.fifo`.

PostgreSQL 16 stores `numeric(20, 2)`. The queue runs on LocalStack.

</details>

<details>
<summary>🌐 Presentation</summary>

- `http` — wallet and wager routes. Identity plugs in through `ProviderIdentityProtocol`.
- `health` — liveness and readiness. `GET /health/live` answers `200` with `{"status":"live"}`. `GET /health/ready` asks Postgres and SQS at the same time; one failed probe answers `503` with `{"status":"unavailable"}`.

`src/main.ts` reads `PORT`, default `3000`, and enables the shutdown hooks. `src/app.module.ts` wires one instance of the ORM, the clock, the logger, the SQS client, the queue, the publisher, the outbox worker, the reference worker, and the consumer. `RuntimeService` starts the three workers on boot and closes them on shutdown. No migration runs at boot.

The controller stays thin. The balance rule stays in the domain.

</details>

## Run

```bash
bun install
cp .env.example .env
docker compose up -d
bun run migration:up
bun run start
```

`docker compose` starts PostgreSQL 16 and LocalStack, and the ready script creates `wager-transactions.fifo` and `wager-transactions-dlq.fifo`. `bun run start:dev` restarts on change. `bun run test:unit` runs the unit suite, and `bun run test:int` runs the integration suite against `DATABASE_URL`.

`LOG_PRETTY=true` writes one text line per log. A missing value or `false` writes JSON.

<details>
<summary>🧩 Shape</summary>

Clean Architecture, domain-driven design, and a spec before the code.

A plug-in contract ends with `Protocol`, as in Swift. The file is `mapper.protocol.ts`. Inside, the TypeScript interface takes an input and returns an output.

```ts
interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
```

`Mapper` is the naming example. The file lives in `application/protocols`. The clock is `ClockProtocol`. Provider identity is `ProviderIdentityProtocol`. The logger implements `LoggerProtocol`. `TheoryProtocol` and `PatternProtocol` are there too.

</details>

<details>
<summary>🎨 Stack</summary>

- ⬛ Bun 1.x
- 🟥 NestJS
- 🟦 TypeScript, strict
- 🟦 PostgreSQL 16
- 🟩 MikroORM
- 🟧 SQS on LocalStack

</details>

<details>
<summary>🌿 History</summary>

A branch leaves `main` as `<type>/<area>/<subject>`. The type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. The area is where the work sits. The subject names the functionality, as in `feat/docs/readme`. The commit uses that same type. One Conventional Commit per pull request. `main` changes only through a pull request.

</details>

## Screenshots

The on-call engineer. The ledger stayed calm. He did not.

![Fortune Tiger celebrating a very responsible balance](docs/screenshots/tiger.jpg)
