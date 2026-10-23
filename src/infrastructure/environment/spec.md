# Environment

One file reads `process.env`. `environment.ts` holds `Environment`, a plain class with one getter per variable. It carries no business rule, and it caches nothing, so a test can change a variable and read it again.

| Getter | Variable | Fallback |
| --- | --- | --- |
| `port` | `PORT` | `3000` |
| `pretty` | `LOG_PRETTY` | `false` |
| `databaseUrl` | `DATABASE_URL` | absent |
| `metricsBackend` | `METRICS_BACKEND` | `prometheus` |
| `region` | `AWS_REGION` | `us-east-1` |
| `endpoint` | `AWS_ENDPOINT_URL` | absent |
| `accessKeyId` | `AWS_ACCESS_KEY_ID` | `test` |
| `secretAccessKey` | `AWS_SECRET_ACCESS_KEY` | `test` |
| `queueUrl` | `SQS_QUEUE_URL` | empty string |
| `deadLetterQueueUrl` | `SQS_DEAD_LETTER_QUEUE_URL` | empty string |

`environment.module.ts` provides one `Environment` and exports it. Every infrastructure module imports that module. `main.ts` reads the port from the container, and `src/app.module.ts` no longer touches the variable. No other file reads `process.env`.

The fallback for the queue URL is the empty string on purpose: the client fails at the probe, not at the import.

Unit tests live in `tests/environment.test.ts`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
