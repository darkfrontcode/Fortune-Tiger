# Health

Health checks are application operations. `CheckHealthLivenessUseCase` reports that the process is alive. `CheckHealthReadinessUseCase` asks all registered `ReadinessProtocol` probes and throws `HealthReadinessError` if any dependency is unavailable.

The use cases and errors do not depend on HTTP. The health module composes the database and queue probes.
