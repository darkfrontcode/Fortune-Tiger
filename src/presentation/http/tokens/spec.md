# HTTP Tokens

`PROVIDER_IDENTITY` identifies the provider identity contract used by the HTTP authentication guard. `HttpModule` binds it with `useFactory` over `ProviderIdentityFactory`, which reads `AUTH_MODE` from `Environment`: the anonymous implementation by default, the JWT implementation with the issuer, the audience, and the JWKS URL in the `jwt` mode.

`index.ts` reexports the token with `export *`.
