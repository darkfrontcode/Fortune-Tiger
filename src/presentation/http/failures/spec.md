# Failures

One chain that turns an application error into an HTTP response. Chain of Responsibility.

`FailureHandler` in `failure-handler.ts` is the abstract base. `link` attaches the next handler and returns it, so the chain reads left to right. `handle` walks the chain: a handler that answers replies and stops, a handler that does not answer delegates to the next. The base owns the `reply` writer; a concrete handler decides what to answer and how.

Each handler answers one error family. `HttpExceptionHandler` keeps the Nest status and body. `ProviderIdentityHandler` answers `401`. `NotFoundHandler` answers `404` with the message of `WalletNotFoundError`, `WagerNotFoundError`, or `JourneyNotFoundError`. `ReconciliationNotFoundHandler` preserves the structured not-found body. `ConflictHandler` answers `409` for `WalletConflictError`, which replaces the message-string match on the wallet conflict. `ReadinessHandler` answers `503` with the health `unavailable` body. `FallbackHandler` always answers: it logs the message and sends `503` with `INFRASTRUCTURE_FAILURE_MESSAGE`'s body.

`HttpFailureFilter` in `filters/` builds the chain once and forwards every exception to it. Adding an error means adding one handler and one `link`; the filter does not grow.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
