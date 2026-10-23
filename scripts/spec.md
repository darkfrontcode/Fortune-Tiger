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

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
