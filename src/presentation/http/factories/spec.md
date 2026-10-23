# Factories

The values this folder builds from `Environment`, so the module keeps only the wiring.

`provider-identity.factory.ts` holds `ProviderIdentityFactory`, an `@Injectable()` class that receives `Environment` in the constructor and answers one `ProviderIdentityProtocol` from `create()`. Any `AUTH_MODE` other than `jwt` answers `AnonymousProviderIdentity`, so a missing or misspelled mode keeps the permissive local behavior. The `jwt` mode builds `JwtProviderIdentity` with the issuer, the audience, and the JWKS URL. A `jwt` mode without `OIDC_JWKS_URL` refuses to boot with `JWKS_URL_REQUIRED_MESSAGE`, because a guard that verifies nothing would be worse than a startup failure.

`index.ts` reexports the file with `export *`. Unit tests live in `../tests/provider-identity.factory.test.ts`.
