# Observability protocols

`LoggerProtocol` exposes the application warning operation.

`MetricProtocol` exposes three operations. `increment` counts one occurrence of a name. `observe` records one duration in milliseconds under a name. `render` writes the exposition text a scrape reads. Application use cases depend on this contract; infrastructure supplies the logger and metric adapters, and the name always comes from `../data`.

`MetricProtocol` carries no runtime value, so the token lives in `../tokens`.
