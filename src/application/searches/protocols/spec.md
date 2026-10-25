# Protocols

Two contracts define the search boundary: `EmbeddingProtocol` in `embedding.protocol.ts` converts text into a vector, and `VectorSearchProtocol` in `vector-search.protocol.ts` finds the nearest documents in the searchable collection. Each carries an input and an output.

The protocol names and the `Symbol` tokens (`EMBEDDING`, `VECTOR_SEARCH`) travel together, so a provider, an `atlas-local`, or a runner could plug a different adapter without changing the use case.
