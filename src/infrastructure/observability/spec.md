# Observability

`ClockProtocol` is the injectable clock. The file is `clock.protocol.ts`. A plug-in contract ends with `Protocol`. `SystemClock` implements it with the system time.

`SimpleLogger` is the application log API. It implements `LoggerProtocol`. `open` receives the clock and `pretty`. The Nest adapter reads `LOG_PRETTY` and passes `pretty`; the adapter arrives with the boot. Pretty output when the value is true. JSON when the variable is missing or false. `child` attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. `warn` writes one line to the standard output. `amount`, `money`, and the wager body never enter the log. No full financial payload.

A line carries `time`, `level`, `message`, and the context of the child. JSON is one object per line. Pretty is one text line with `key=value` pairs. An absent field is not written. `child` returns another logger and does not change the parent.

Metrics cover transactions by status, duplicates, retries, DLQ messages, lock conflicts, outbox lag, and processing latency.

## Module

`observability.module.ts` imports `EnvironmentModule` and provides two tokens. `CLOCK` is `SystemClock`. `LOGGER` is `SimpleLogger.open` with the clock and `pretty` from `Environment`. Both tokens are exported, so no other module builds a clock or a logger.

OpenTelemetry and a dashboard are out.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
