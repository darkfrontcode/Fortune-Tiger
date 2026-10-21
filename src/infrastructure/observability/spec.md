# Observability

`ClockProtocol` is the injectable clock. The file is `clock.protocol.ts`. A plug-in contract ends with `Protocol`.

`SimpleLogger` is the application log API. Nest gets a thin adapter that delegates to `SimpleLogger`. Pretty output when `LOG_PRETTY=true`. JSON when the variable is missing or false. `child` attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. `amount`, `money`, and the wager body never enter the log. No full financial payload.

Metrics cover transactions by status, duplicates, retries, DLQ messages, lock conflicts, outbox lag, and processing latency.

OpenTelemetry and a dashboard are out.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
