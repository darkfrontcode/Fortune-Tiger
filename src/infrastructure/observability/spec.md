# Observability

`ClockProtocol` is the injectable clock. The file is `clock.protocol.ts`. A plug-in contract ends with `Protocol`. `SystemClock` is `@Injectable()` and implements it with the system time; `observability.module.ts` binds it to `CLOCK`.

`SimpleLogger` is the application log API. It implements `LoggerProtocol`. `open` receives the clock and `pretty`. The Nest adapter reads `LOG_PRETTY` and passes `pretty`; the adapter arrives with the boot. Pretty output when the value is true. JSON when the variable is missing or false. `child` attaches `correlationId`, `messageId`, `transactionId`, `walletId`, and `providerId`. `warn` writes one line to the standard output. `amount`, `money`, and the wager body never enter the log. No full financial payload.

A line carries `time`, `level`, `message`, and the context of the child. JSON is one object per line. Pretty is one text line with `key=value` pairs. An absent field is not written. `child` returns another logger and does not change the parent.

`LoggerService` is the Nest adapter: `log`, `error`, `warn`, `debug`, `verbose`, and `fatal` write one `SimpleLogger` line with the matching level. The message starts with `[FortuneTiger]:` and the emoji of the level: `💬` log, `❌` error, `⚠️` warn, `🐞` debug, `🔎` verbose, and `💀` fatal. `src/main.ts` hands it to `useLogger`, so Nest writes through the same logger as the application.

## Metric

`PrometheusMetric` is the default adapter. It implements `MetricProtocol`, holds one private `Registry`, and creates a `Counter` on the first `increment` and a `Summary` on the first `observe`, with the help text from `MetricDescriptionMap` in `application/observability/maps`. `render` returns `registry.metrics()`, the text Prometheus scrapes. The counters stay in the process, so a scrape reads the instance that served the request.

The constructor also registers the default process metrics through `collectDefaultMetrics`, so the exposition carries `process_resident_memory_bytes` and the other standard Node metrics. They are library-named, not invented by the adapter, and they answer the operational questions an alert set asks: how much memory the process uses and whether it is still up.

`SimpleMetric` is the memory adapter, chosen by `METRICS_BACKEND=memory`. `increment` counts one name, `count` reads it, `observe` sums one name, and `render` writes the same exposition shape without the percentiles. It serves unit tests and a run with no Prometheus client.

The names come from `application/observability/data`: transactions by status, duplicates, retries, dead letters, lock conflicts, outbox lag, and processing latency. No adapter invents a name.

## Module

`observability.module.ts` imports `EnvironmentModule` and provides three tokens. `CLOCK` is `SystemClock`. `LOGGER` is `SimpleLogger.open` with the clock and `pretty` from `Environment`. `METRIC` is built by a factory: `SimpleMetric` when `METRICS_BACKEND` is `memory`, `PrometheusMetric` otherwise. The tokens are exported, so no other module builds a clock, a logger, or a metric. `SimpleLogger` answers to its class token through `useExisting`, `LoggerService` is provided and exported, and `src/main.ts` hands it to `useLogger`.

The cross-cutting `LOGGER` and `METRIC` tokens are declared in `application/observability/tokens`. `CLOCK` is declared in `application/time/tokens`.

OpenTelemetry and a dashboard stay out. The Prometheus exposition is in.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
