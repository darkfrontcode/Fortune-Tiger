# Protocols

`journey.store.protocol.ts` holds `JourneyStoreProtocol`. `record` appends one step and answers when the document exists. `timeline` returns the steps that match the query, ordered.

The procedure is the adapter's problem. The application only knows that a step can be appended and read back, so Mongoose stays outside this folder.
