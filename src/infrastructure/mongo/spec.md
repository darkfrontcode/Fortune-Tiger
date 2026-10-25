# Mongo

`mongo.connection.ts` holds `MongoConnection`. It builds one Mongoose connection from `Environment.mongoUrl` and never awaits it, so an unreachable MongoDB does not stop the boot and does not touch a financial operation. `bufferCommands` is `false` and the server selection timeout is two seconds, so a write or a read fails instead of waiting in memory. A connection error goes to `LOGGER` as a warning, without a document or a payload.

One adapter module owns the connection and both stores share it: `AuditStoreModule` and `JourneyStoreModule` import `MongoModule`, so the process opens one pool, not one per collection.

The connection closes on application shutdown through `OnApplicationShutdown`.

There is no MongoDB probe in `/health/ready`: a store that is allowed to be unavailable must not take the API out of the load balancer.

## Module

`mongo.module.ts` holds `MongoModule`. It imports `EnvironmentModule` and `ObservabilityModule`, provides `MongoConnection`, and exports it. The barrel reexports the connection and the module.
