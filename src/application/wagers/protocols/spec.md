# Wager protocols

`WagerGatewayProtocol` submits one wager through the persistence transaction. `WagerReaderProtocol` reads wagers by id or provider/external id. `WagerStrategyProtocol` mediates one wager kind against the wallet and reference context. Wager use cases consume the gateway and reader; persistence implements those ports. Wager strategies implement the strategy contract.
