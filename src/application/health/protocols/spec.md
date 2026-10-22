# Health protocols

`ReadinessProtocol` answers whether one external dependency is reachable. The health readiness use case composes the database and queue probes through this port. Infrastructure implements the probes; presentation translates an unavailable result to the health response.
