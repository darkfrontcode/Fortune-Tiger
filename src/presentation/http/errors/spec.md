# Errors

The errors this presentation folder raises on its own. An application error keeps its owner in `src/application` and is not rebuilt here.

`provider-identity.error.ts` holds `ProviderIdentityError`. The identity providers throw it when the caller cannot be resolved: a missing or malformed `Authorization` header, a token that fails verification, or a payload without the `provider_id` claim. The message is `INVALID_CREDENTIAL_MESSAGE` from `../data`. `HttpFailureFilter` translates the error to `401`.

`index.ts` reexports the file with `export *`.
