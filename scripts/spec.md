# Scripts

Local orchestration. No business rule, no adapter, and no import from the domain. The folder exists so an evaluator proves the delivery with one command.

## verify

`scripts/verify.ts` runs the static gate: `bun run build`, then `bun run test:unit`. No Docker, no database, no queue. It answers exit code `0` only when both steps pass.

## verify:full

The argument `full` turns the same script into the complete gate: the local preflight, the static gate, the migrations, the integration suite, the concurrency suite, and the end-to-end suite. Use it when PostgreSQL and LocalStack are running.

The preflight reads `Environment`, never `process.env`, so `.env` supplies the targets. `DATABASE_URL` is the PostgreSQL target and `AWS_ENDPOINT_URL` is the LocalStack target. A variable that is missing, or a port that does not answer within two seconds, stops the run with the dependency name and the `docker compose up -d` hint. The script does not start a container.

## Behavior

- Steps run in order. The first failure stops the run and keeps the exit code `1`.
- Each step delegates to the `package.json` script, so the command has one owner.
- Child output goes straight to the terminal, so a failing test shows its own message.
- The script installs nothing, creates no queue, writes no file, and takes no argument other than `full`.
- `bun run verify` and `bun run verify:full` are the only entries other folders know.

## demo

`scripts/demo.ts` proves the happy path without a second terminal. It boots `AppModule` with the same validation pipe as `src/main.ts`, listens on a free port, and calls the HTTP API over `fetch`.

The sequence follows the statement: open a `BRL` wallet with `100.00`, submit a `BET` of `30.00`, repeat that request with the same `Idempotency-Key`, submit a `LOSS`, read the ledger page, compare the wallet with its ledger, and read `GET /metrics`.

Every step asserts the contract:

- liveness answers `200` with `live`, and readiness answers `200` with `ready`;
- the wallet answers `201` with an opening balance of `100.00`;
- the bet answers `200` with `PROCESSED` and a balance of `70.00`;
- the repeat answers `200` with `idempotentReplay: true`, the same `transactionId`, and the balance stored at that processing;
- the loss answers `200` with `PROCESSED` and the balance unchanged;
- the ledger page carries the `OPENING` credit and the bet debit, in that order;
- the reconciliation answers `consistent: true`, a `difference` of `0.00`, and two checked entries;
- the exposition carries the processed and duplicate counters, at least the value the demo produced.

The output is one line per check, marked `✅`. A failed assertion prints the name, the expected value, and the observed value, and the process answers exit code `1`. The application closes in a `finally`, so the workers do not stay open.

The boot needs the same `.env`, PostgreSQL, LocalStack, and applied migrations as `bun run start`. The script creates no queue, writes no file, and takes no argument. The queue path stays covered by `requests.http`, `docs/API.md`, and the integration suite.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
