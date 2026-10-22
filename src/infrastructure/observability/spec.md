# Observability

`ClockProtocol` is the injectable clock. The file is `clock.protocol.ts`. A plug-in contract ends with `Protocol`. `SystemClock` is `@Injectable()` and implements it with the system time; `observability.module.ts` binds it to `CLOCK`.

`SimpleLogger` is the application log API. It implements `LoggerProtocol`. `open` receives the clock and `pretty`. The Nest adapter reads `LOG_PRETTY` and passes `pretty`; the adapter arrives with the boot. Pretty output when the value is true. JSON when the variable is missing or false. `child` attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. `warn` writes one line to the standard output. `amount`, `money`, and the wager body never enter the log. No full financial payload.

A line carries `time`, `level`, `message`, and the context of the child. JSON is one object per line. Pretty is one text line with `key=value` pairs. An absent field is not written. `child` returns another logger and does not change the parent.

`LoggerService` is the Nest adapter: `log`, `error`, `warn`, `debug`, `verbose`, and `fatal` write one `SimpleLogger` line with the matching level. The message starts with `[FortuneTiger]:` and the emoji of the level: `💬` log, `❌` error, `⚠️` warn, `🐞` debug, `🔎` verbose, and `💀` fatal. `src/main.ts` hands it to `useLogger`, so Nest writes through the same logger as the application.

`SimpleMetric` is the metric adapter. `increment` counts one name in memory, and `count` reads it. A real exporter is out of scope; the counters stay in the process.

Metrics cover transactions by status, duplicates, retries, DLQ messages, lock conflicts, outbox lag, and processing latency.

## Module

`observability.module.ts` imports `EnvironmentModule` and provides three tokens. `CLOCK` is `SystemClock`. `LOGGER` is `SimpleLogger.open` with the clock and `pretty` from `Environment`. `METRIC` is `SimpleMetric`. The tokens are exported, so no other module builds a clock, a logger, or a metric. `SimpleLogger` answers to its class token through `useExisting`, `LoggerService` is provided and exported, and `src/main.ts` hands it to `useLogger`.

The cross-cutting tokens are declared in `application/dependencies/tokens`.

OpenTelemetry and a dashboard are out.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
