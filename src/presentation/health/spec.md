# Health

No authentication.

- `GET /health/live` — the process is up. Answers `200` with `{ "status": "live" }`.
- `GET /health/ready` — Postgres and SQS are reachable. Answers `200` with `{ "status": "ready" }`, or `503` with `{ "status": "unavailable" }`.

## Ready

`HealthService` asks both probes at the same time. Postgres answers when `select 1` runs on the ORM connection. SQS answers when `GetQueueAttributes` reaches the main queue for its `QueueArn`.

The SQS client is built with `maxAttempts` 1, and the probe aborts the request after 2000 ms, so a dead dependency fails the check instead of hanging it. One failed probe is enough for `503`.

The probe reads `SQS_QUEUE_URL`, `AWS_REGION`, and `AWS_ENDPOINT_URL`. `DATABASE_URL` stays with the ORM.

## Boot

`src/main.ts` reads `PORT`, default `3000`, and enables the shutdown hooks, so `SIGTERM` and `SIGINT` close the application.

`src/app.module.ts` wires one instance of the ORM, the clock, the logger, the SQS client, the queue config, the publisher, the outbox worker, the reference worker, and the queue consumer. `RuntimeService` starts the three workers on boot and closes them on shutdown. No migration runs at boot.

`LOG_PRETTY` is read once at boot and given to `SimpleLogger`. Nest keeps its own startup line; the application log is `SimpleLogger`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
