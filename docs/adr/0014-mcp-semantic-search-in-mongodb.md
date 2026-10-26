# 0014. Semantic search through MCP over MongoDB Vector Search

- Status: Accepted
- Date: 2026-10-25

## Context

A provider, or an AI agent through the Model Context Protocol, wants to find past events and failures similar to a description: "a bet that was rejected because the balance ran out". The financial truth stays in PostgreSQL, the timeline in MongoDB (`audit_events`). Neither is shaped for meaning-based similarity, and nobody wants the semantic path to join a balance transaction.

The community `mongo:7` image has no `mongot`, so `$vectorSearch` only works on the `atlas-local` image. Ollama provides the embeddings, and it is the default embedding provider: the feature is on unless a paid-model API key is configured, and the team never configures one, so the pipeline always uses Ollama. The feature stays disableable through `VECTOR_SEARCH_ENABLED`, and no model is downloaded by the application code.

## Decision

A `search` compose profile runs two extra containers for a local operator: `mongodb/mongodb-atlas-local` on port `27018` (bundles `mongot`, so `$vectorSearch` works) and `ollama` on port `11434`. The feature is off unless `VECTOR_SEARCH_ENABLED=true`. In CI for main and staging the pipeline starts the same two containers directly — it does not need the compose profile — pulls the model, seeds, and exercises a real search.

- A new `searchable_events` collection on the atlas-local instance holds one non-financial summary per audit event, with an embedding. It is a read model, seeded by the operator step `bun run search:seed` from the existing `audit_events`; the application never writes it at request time. `id` is the source `eventId`, and the upsert is keyed on it, so re-seeding never duplicates.
- `application/searches` owns the capability: `EmbeddingProtocol` and `VectorSearchProtocol`, their `EMBEDDING` and `VECTOR_SEARCH` tokens, and `SearchSimilarEventsUseCase`. The use case trims the query, guards it, embeds through the contract, and searches through the contract.
- `infrastructure/search` holds the adapters: `OllamaEmbedding` (calls `POST /api/embed`), `MongoVectorSearch` (runs the `$vectorSearch` pipeline and projects only safe read fields), `SearchConnection`, and the schema. The vector adapter never projects `embedding`, `text`, `providerId`, an amount, or a balance.
- `infrastructure/mcp` holds `registerSearchTool`, which exposes the single tool `search_similar_events` over stdio. `scripts/mcp.ts` is the entry: it creates a Nest context over `SearchesModule` only, refuses when `VECTOR_SEARCH_ENABLED` is false, and connects an `McpServer` to a `StdioServerTransport`. It is decoupled from the HTTP application: no listener, no worker, no financial route.
- The read models and embeddings are additive. PostgreSQL remains the financial source, and the wallet, ledger, wager, and outbox are untouched.

## Consequences

- The search feature requires two extra services and a model pull, so a plain local run and `bun run verify` do not require them. They are not optional in the pipeline: CI for main and staging brings the search stack up, pulls the model, seeds, and runs a real search as a gate.
- A semantic search never moves a balance. It reads a projected, non-financial document and exposes only safe fields.
- The search environment runs in the CI pipeline for main and staging just like Postgres, LocalStack, and Mongo: the workflow starts `mongodb/mongodb-atlas-local` and `ollama`, waits for their health, pulls `OLLAMA_EMBEDDING_MODEL`, runs the seed, and exercises a real search through `SearchSimilarEventsUseCase`. The application code itself never pulls a model; the pipeline does the pull, so a runtime cannot trigger a surprise download.
- `search` becomes a fully separate memory: operators run, back up, and secure the atlas-local instance and Ollama separately from Postgres and the audit Mongo.
- The index must exist before search answers; `bun run search:seed` creates it when it is missing, and an empty or missing index answers no matches rather than a financial error.
- The summary is only as good as the audit metadata it is built from. Improvements to the seed text improve every search, and the seed can be re-run idempotently.
