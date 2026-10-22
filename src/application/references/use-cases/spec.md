# Reference use cases

`RetryReferencesUseCase` asks `ReferenceReaderProtocol` for due wager IDs and retries them sequentially through `ReferenceGatewayProtocol`. It returns counts by resulting status. The reference worker supplies the current time and batch limit.
