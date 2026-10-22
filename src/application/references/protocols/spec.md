# Reference protocols

`ReferenceReaderProtocol` returns due pending-reference wager ids for a time and limit. `ReferenceGatewayProtocol` retries one wager and returns its retry result when the wager is still eligible. `RetryReferencesUseCase` consumes both ports; persistence implements them.
