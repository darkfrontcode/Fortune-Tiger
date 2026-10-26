# Tokens

Two `Symbol` tokens, one per contract: `EMBEDDING` in `embedding.token.ts` and `VECTOR_SEARCH` in `vector-search.token.ts`. The owning module binds each adapter with `useExisting`, and the use case injects the token, never the adapter class.
