# Tokens

`journey.store.token.ts` holds `JOURNEY_STORE`, one `Symbol`. The consumer injects the token, never the adapter class. `JourneyStoreModule` binds it with `useExisting`, so one instance answers to both names.

`index.ts` reexports the token with `export *`.
