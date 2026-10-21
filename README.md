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

`wager` is in place. `WagerTransaction` is born `PENDING`. It can move to `PENDING_REFERENCE`, `PROCESSED`, `REJECTED`, or `FAILED`. `PENDING_REFERENCE` can move to `PROCESSED`, `REJECTED`, or `FAILED`. A terminal status does not change. `reject` and `fail` store a `failureCode`. `create` requires a reference for `REFUND` and `ROLLBACK`. `rehydrate` rebuilds and does not recheck.

An entity has an `id`. A value object has no `id` and is compared by value. The folder is the concept, and the file is the concept: `ledger/ledger.ts`. `entities/` and `values/` appear inside a concept only when that concept needs both.

The private constructor receives a `schema`. A getter reads it. A rule method writes it. Types of a concept live in `types.ts`, in a namespace `{Concept}Type`.

</details>

<details>
<summary>⚙️ Application</summary>

- `transactions` — `WagerService` hashes the payload and calls `WagerGatewayProtocol`. `WagerMediator` and strategies run inside the SQL transaction (`WagerSubmitWriter`). HTTP and the queue will call the same service later.
- `reconciliations` — `reconciliation.service.ts` compares the wallet with the ledger.
- `idempotencies` — `idempotency.service.ts` hashes the canonical business payload. `outcome` replays with `observedBalance`, or returns `IDEMPOTENCY_PAYLOAD_CONFLICT` when the key repeats with a different body.

One word, plural, no hyphen in the middle of the name.

</details>

<details>
<summary>🗄️ Infrastructure</summary>

- `persistence` — MikroORM, schema, and the wallet lock
- `messaging` — queue, consumer, inbox, outbox, and the event envelope
- `observability` — `SimpleLogger`, `ClockProtocol`, and metrics
- `protocols` — `TheoryProtocol`, the contract a unit theory plugs in

`persistence` is in place for `wallets` and `wallet_ledger_entries`. Migrations are versioned and reversible. Money columns are `numeric(20, 2)` with `currency char(3)`. Copy `.env.example` to `.env`, run `docker compose up -d postgres`, then `test:int` and `migration:*` read `DATABASE_URL`.

`observability` is in place for `SimpleLogger` and `SystemClock`. A child logger attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. The line is JSON, or pretty when `open` receives `pretty`; the Nest adapter will read `LOG_PRETTY`. No financial payload enters the log.

PostgreSQL 16 stores `numeric(20, 2)`. The queue runs on LocalStack.

</details>

<details>
<summary>🌐 Presentation</summary>

- `http` — wallet and wager routes. Identity plugs in through `ProviderIdentityProtocol`.
- `health` — liveness and readiness.

The controller stays thin. The balance rule stays in the domain.

</details>

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
