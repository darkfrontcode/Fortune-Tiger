# Searches

Semantic search meets the read models. A provider, or an AI agent through MCP, asks for events and failures similar to a description, and the answer lists the nearest documents without exposing financial or personal data.

The search is a read model on MongoDB Vector Search. It is never a replacement for an exact query, a financial aggregation, or a balance validation. The wallet, the ledger, the wager, and the outbox stay in PostgreSQL; the searchable documents are a projection and the financial truth never waits for them.

The feature is gated by `VECTOR_SEARCH_ENABLED` in `Environment`: when it is false, no embedding is built and no vector search answers. When it is true, the use case answers through the embedding contract and the vector-search contract. Ollama is the default embedding provider, and the CI pipeline for main and staging brings the search stack up, pulls the model, seeds, and runs a real search through this use case on every run.

## Types

`types.ts` holds the `SearchType` namespace. `Schema` is the stored searched document. `SimilarInput` is the request. `Query` is the vector search query. `Result` is one answer. `SearchOutput` wraps the items.

`Schema` carries only the fields the search needs and that are safe to project:

| Field | Meaning |
| --- | --- |
| `id` | the stable document id (the source event id) |
| `eventType` | the integration event type, e.g. `WagerTransactionRejected` |
| `kind` | the wager kind, e.g. `BET` |
| `status` | the status, e.g. `REJECTED` |
| `failureCode` | the machine-readable failure, absent when there is none |
| `text` | the searchable summary indexed for semantics |
| `occurredAt` | when the event happened |
| `providerId` | the provider that owns the event |
| `wagerId` | the wager this event belongs to |
| `embedding` | the vector produced by the embedding contract |

`text` is a short, non-financial sentence built from the projection: the kind, the status, and the failure. No amount, no balance, no personal name, and no token ever enters it.

## Contracts

`protocols/embedding.protocol.ts` holds `EmbeddingProtocol`, one method:

```ts
interface EmbeddingProtocol {
  embed(text: string): Promise<Array<number>>
}
```

`protocols/vector-search.protocol.ts` holds `VectorSearchProtocol`, one method:

```ts
interface VectorSearchProtocol {
  search(query: SearchType.Query): Promise<Array<SearchType.Document>>
}
```

The protocols are pure contracts with no runtime value. `EMBEDDING` lives in `tokens/embedding.token.ts`, `VECTOR_SEARCH` in `tokens/vector-search.token.ts`, one `Symbol` each. The adapters bind both tokens with `useExisting`; the use case injects only the tokens.

`Query` carries `embedding: number[]`, an optional `eventType`, and the `limit`. `Result` is the safe projection the adapter returns; `SearchOutput` wraps the items.

## Use case

`use-cases/search-similar-events.use-case.ts` holds `SearchSimilarEventsUseCase`, `@Injectable()`. It receives `EMBEDDING`, `VECTOR_SEARCH`, and the `SEARCH` context configuration through the constructor.

`execute` receives `SearchType.SimilarInput` and returns `SearchType.SearchOutput`:

1. Guard the query. An empty query and a query longer than `VECTOR_SEARCH_MAX_TEXT_LENGTH` are refused with `INVALID_SEARCH_QUERY_MESSAGE`. A `limit` above `VECTOR_SEARCH_TOP_K` is capped; a `limit` below one becomes one.
2. Build the embedding for the query through `EMBEDDING.embed`.
3. Ask `VECTOR_SEARCH.search` with the embedding, the optional `eventType`, and the limited value.
4. Return the projected `Result` items. The embedding, the `text`, and the `providerId` never leave the adapter: only `id`, `eventType`, `kind`, `status`, `failureCode`, `score`, `wagerId`, and `occurredAt` reach the caller.

The use case is the only application operation here. It holds `idempotency` and the rest of the application untouched; the MCP layer and any future HTTP route call it through the module export.

## Module

`searches.module.ts` imports `SearchStoreModule` and `ObservabilityModule`, provides `SearchSimilarEventsUseCase`, and exports it. The module binds no adapter: the infrastructure `SearchStoreModule` owns `EMBEDDING` and `VECTOR_SEARCH`.

The barrel `index.ts` reexports the data, the protocols, the tokens, the types, and the use case with `export *`.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
