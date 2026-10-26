# MCP

A standalone Model Context Protocol server. It is an edge adapter, not part of the HTTP application: it talks stdio to an AI client and calls the application `SearchesModule` for the answer. It exposes one tool, `search_similar_events`, and nothing else. No financial write, no balance, no wallet, and no ledger operation lives here.

The server answers only when `VECTOR_SEARCH_ENABLED` is true and the `atlas-local` profile (`docker compose --profile search up -d`) with Ollama is up, or `scripts/mcp.ts` stops with the hint. The CI pipeline for main and staging brings up that stack, pulls the model, seeds, and exercises a real search; the same tool path is proven on every run through `scripts/search-check.ts`.

## Tool

`search.tool.ts` holds `registerSearchTool`. It receives the `McpServer` and the `SearchSimilarEventsUseCase`, and registers one tool through the SDK:

- name `search_similar_events`
- a description that states the tool searches past events and failures by meaning and returns the nearest matches with their score
- an input schema with `query` (string, required), `eventType` (string, optional), and `limit` (integer, optional)

The handler validates through the schema, calls `useCase.execute`, and formats the `SearchOutput` into MCP text content. An error from the use case is caught and returned as a readable `isError` text block, so the AI client sees the message (an invalid query, an unreachable embedder or vector store) instead of a stack trace.

`formatSearchOutput` is the pure formatter, exported so the tests read exactly what reaches the client. One line per result: the score, the `eventType`, the `kind`, the `status`, the `failureCode` when present, the `wagerId` when present, and the `occurredAt`. No `embedding`, no `text`, no `providerId`, no amount, and no balance ever appears on a line.

## Entry

`scripts/mcp.ts` is the entry. It imports `reflect-metadata`, creates a Nest application context over `SearchesModule` only (no HTTP, no workers), reads `Environment`, refuses when `vectorSearch` is false, obtains the `SearchSimilarEventsUseCase` from the container, builds the `McpServer` with the SDK, registers the tool, connects a `StdioServerTransport`, and waits. `SIGINT` and `SIGTERM` close the transport and the application context.

`bun run mcp` is the package.json script.

All project text is English, including the root `README.md`. History: branch `<type>/<area>/<subject>`, one Conventional Commit, pull request into `main`. The rule is in the root `AGENTS.md`. The root `README.md` is updated when this behavior lands.
