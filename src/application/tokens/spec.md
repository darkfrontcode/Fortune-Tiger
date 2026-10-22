# Tokens

A port that is plugged at runtime needs an identity the container resolves. That identity is a token: one `Symbol`, one file, one constant. The name is `UPPER_SNAKE_CASE` and takes the protocol name without the `Protocol` suffix.

| File | Constant | Port |
| --- | --- | --- |
| `clock.token.ts` | `CLOCK` | `ClockProtocol` |
| `logger.token.ts` | `LOGGER` | `LoggerProtocol` |
| `publisher.token.ts` | `PUBLISHER` | `PublisherProtocol` |
| `reference.gateway.token.ts` | `REFERENCE_GATEWAY` | `ReferenceGatewayProtocol` |
| `reference.reader.token.ts` | `REFERENCE_READER` | `ReferenceReaderProtocol` |
| `wager.gateway.token.ts` | `WAGER_GATEWAY` | `WagerGatewayProtocol` |

A token does not sit beside the interface. `protocols` describes the contract and carries no runtime value; this folder carries the wiring. The module that owns the adapter binds the token with `useExisting`, so one instance answers to both names. A consumer injects the token and never the adapter class.

`ReadinessProtocol` and `MetricProtocol` have no token: the health module joins the two readiness probes itself, and the metric adapter does not exist yet. `QUEUE_CONFIG` is not a port and stays in `messaging/factories/queue.factory.ts`, beside the factory that builds it.

`index.ts` reexports the folder with `export *`. Callers import the folder.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`.
