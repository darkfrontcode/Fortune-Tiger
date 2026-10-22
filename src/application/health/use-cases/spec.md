# Health use cases

`CheckHealthLivenessUseCase` returns the live status without checking external dependencies.

`CheckHealthReadinessUseCase` checks all injected readiness probes concurrently. It returns the ready status only when every probe succeeds; otherwise it throws `HealthReadinessError`.
