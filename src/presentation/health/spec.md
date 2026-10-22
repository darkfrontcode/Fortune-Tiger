# Health

No authentication.

- `GET /health/live` — the process is up. Answers `200` with `{ "status": "live" }`.
- `GET /health/ready` — Postgres and SQS are reachable. Answers `200` with `{ "status": "ready" }`, or `503` with `{ "status": "unavailable" }`.

## Ready

`CheckHealthReadinessUseCase` asks both probes at the same time. Postgres answers when `select 1` runs on the ORM connection. SQS answers when `GetQueueAttributes` reaches the main queue for its `QueueArn`.

The SQS client is built with `maxAttempts` 1, and the probe aborts the request after 2000 ms, so a dead dependency fails the check instead of hanging it. One failed probe is enough for `503`.

The queue URL and the client come from `Environment`. `DATABASE_URL` stays with the ORM.

## Module

`health.module.ts` imports `PersistenceModule` and `MessagingModule`, declares the controller, and provides `CheckHealthLivenessUseCase` and `CheckHealthReadinessUseCase`. The readiness use case receives `READINESS` by token; the module binds that token with `useFactory` over `DatabaseReadiness` and `QueueReadiness`. The probes stay out of the controller.

`READINESS` lives in `src/application/health/tokens/`. `HealthReadinessError` is translated by the HTTP filter to the existing `503` response.

## Boot

`src/main.ts` reads the port from `Environment`, default `3000`, and enables the shutdown hooks, so `SIGTERM` and `SIGINT` close the application.

`src/app.module.ts` imports `ObservabilityModule`, `PersistenceModule`, `WagersModule`, `ReferencesModule`, `MessagingModule`, and `HealthModule`. It provides only what spans layers: `ReferenceWorker` and `RuntimeService`, both `@Injectable()`. `RuntimeService` starts the outbox worker, the reference worker, and the queue consumer on boot and closes them on shutdown. No migration runs at boot, and no adapter is built at the root.

`LOG_PRETTY` is read once by `Environment` and given to `SimpleLogger` by `ObservabilityModule`. Nest keeps its own startup line; the application log is `SimpleLogger`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
