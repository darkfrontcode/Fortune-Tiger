# Use cases

`search-similar-events.use-case.ts` holds `SearchSimilarEventsUseCase`, the only application operation of this capability. It guards the query and the limit, builds the embedding through `EMBEDDING`, asks `VECTOR_SEARCH`, and projects only the safe fields.

No other use case lives here. The MCP layer calls this one.
