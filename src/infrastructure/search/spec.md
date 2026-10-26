# Search store

The searchable collection `searchable_events` lives on the `atlas-local` MongoDB instance (`SEARCH_MONGODB_URL`, default `127.0.0.1:27018/fortune_tiger_search?directConnection=true`), which bundles the `mongot` search engine and therefore supports `$vectorSearch`. The shared `MongoConnection` keeps serving the audit and journey stores on `MONGODB_URL` (`mongo:7`); the search store connects to its own instance because that instance is the one that runs the search engine — it is started by the CI pipeline on every main and staging run.

The connection mirrors `MongoConnection`: built from `Environment.searchMongoUrl`, never awaited at the boot, `bufferCommands` false, server selection timeout two seconds, a connection error to `LOGGER` as a warning, and closed on shutdown through `OnApplicationShutdown`. `ready` exposes the pending connection, and the adapter awaits it before the first query, so a query never races a connection that has not opened. No MongoDB probe joins `/health/ready`.

## Document

`searchable-event.schema.ts` holds the `searchable_events` collection, one document per indexed event. The fields are the `SearchType.Schema` fields. `id` is unique (the source event id), because reindexing must never produce a duplicate. `embedding` is an array. The schema declares no vector index: a search index is created once by the operator or the seed script through MongoDB's `createSearchIndex`, named `MONGODB_VECTOR_INDEX`, type `vector`, on the `embedding` path.

## Adapters

`mongo-vector-search.ts` holds `MongoVectorSearchAdapter`, the adapter of `VectorSearchProtocol`. `search` builds the aggregation pipeline with `$vectorSearch` as the first stage: `index`, `path` embedded, `queryVector`, `numCandidates`, and `limit` from the `Query`. When `eventType` is present it adds a `filter` field to the stage. A second stage projects the fields the use case maps. The adapter maps each hit into a `SearchType.Document` plus its `score`, and never throws on an empty result: a query with no answer returns an empty array.

`ollama-embedding.ts` holds `OllamaEmbedding`, the adapter of `EmbeddingProtocol`. It calls `${baseUrl}/api/embed` with `JSON.stringify({ model, input: text })`, parses the answer, and returns the first vector. A transport or parse failure throws, so the MCP tool reports the error instead of inventing a result. No key is sent; the base URL holds the place where Ollama lives.

Both adapters receive their configuration through the constructor from the module that wires them.

## Module

`search.store.module.ts` holds `SearchStoreModule`. It imports `EnvironmentModule`, `ObservabilityModule`, and `MongoModule`, provides `SearchConnection` and the two adapters, binds `EMBEDDING` with `useExisting` to `OllamaEmbedding` and `VECTOR_SEARCH` with `useExisting` to `MongoVectorSearchAdapter`, and exports the two tokens. `SearchesModule` imports this module.

## Tests

The unit tests cover the use case through fakes (see `src/application/searches`). The `atlas-local` profile starts only when the search stack is up. Locally an operator brings it up with `docker compose --profile search up -d`, or CI for main and staging brings it up and starts it on every run. A real search is exercised in the pipeline by `scripts/search.ts` and proven by `scripts/search-check.ts` after the seed. There is no default integration requirement.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
