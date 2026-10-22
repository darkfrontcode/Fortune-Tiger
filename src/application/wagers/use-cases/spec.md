# Wager use cases

Each HTTP wager route has one use case. `SubmitWagerUseCase` builds and submits a wager through `WagerGatewayProtocol`; both HTTP and SQS call it. `FindWagerUseCase` reads a transaction by ID. `FindWagerByProviderUseCase` reads by provider and external transaction ID. Missing wagers throw `WagerNotFoundError`.

The use cases do not depend on HTTP or persistence adapters. `IdempotencyService` remains a shared application collaborator for payload hashing and replay decisions.
