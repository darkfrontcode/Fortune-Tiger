# Factories

The values this folder builds from `Environment`, so the module keeps only the wiring.

`provider-identity.factory.ts` holds `ProviderIdentityFactory`, an `@Injectable()` class that receives `Environment` in the constructor and answers one `ProviderIdentityProtocol` from `create()`. Any `AUTH_MODE` other than `jwt` answers `AnonymousProviderIdentity`, so a missing or misspelled mode keeps the permissive local behavior. The `jwt` mode builds `JwtProviderIdentity` with the issuer, the audience, and the JWKS URL. A `jwt` mode without `OIDC_JWKS_URL` refuses to boot with `JWKS_URL_REQUIRED_MESSAGE`, because a guard that verifies nothing would be worse than a startup failure.

`swagger.factory.ts` holds `SwaggerFactory`, a class that builds the OpenAPI document after the container exists, so it is not a Nest provider and receives no collaborator: `createDocument` returns the document from the DTO metadata and the controller decorators, and `mountDocs` serves it on `/docs` and `/docs-json`. `main.ts`, the end-to-end setup, and `scripts/openapi.ts` build one with `new SwaggerFactory()`.

`index.ts` reexports the files with `export *`. Unit tests live in `../tests/provider-identity.factory.test.ts`.
