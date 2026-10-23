# Providers

This folder owns the presentation-specific provider identity contract and its two implementations. `ProviderIdentityProtocol` resolves the effective provider identity for one HTTP request. `identify` receives the `X-Provider-Id` header, the `providerId` of the body, and the `Authorization` header as `credential`, and answers a promise, because the JWT mode reaches a remote key set.

`provider.identity.protocol.ts` holds the protocol, its input and output types, and `ProviderIdentityConfig`: the issuer, the audience, and the JWKS URL that `http.module.ts` builds from `Environment`.

`AnonymousProviderIdentity` resolves the header when present, falling back to the payload provider identifier. It ignores the credential.

`JwtProviderIdentity` is the `jwt` auth mode. The constructor receives `ProviderIdentityConfig` and builds one remote key set from the JWKS URL, so the keys are cached across requests. `identify` reads the token after the `Bearer` scheme, verifies it with `jose` against that key set, checks the issuer and the audience when they are configured, and reads the `provider_id` claim. A missing header, another scheme, an empty token, a failed verification, or a claim that is not a non-empty string throws `ProviderIdentityError` from `../errors`. A key set that cannot be reached is not a credential problem: the transport error leaves the provider and the global filter answers `503`.

`index.ts` reexports the three files with `export *`.

Unit tests live in `../tests/identity.test.ts`, `../tests/jwt-identity.test.ts`, and `../tests/auth.guard.test.ts`, which covers the guard that consumes the contract.
