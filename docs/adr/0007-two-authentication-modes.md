# 0007. Offer two authentication modes and keep Keycloak optional

- Status: Accepted
- Date: 2026-10-23

## Context

The challenge is about the wallet, not about an identity provider. A local run and the pipeline must not need a realm, a client, and a token endpoint; a deployment must not trust a header that anyone can write.

Hard-coding one mode picks a side: either the delivery is hard to run, or it is insecure wherever it is reachable.

## Decision

One guard, `AuthGuard`, resolves the caller through `PROVIDER_IDENTITY`, and the mode comes from `AUTH_MODE`.

- `anonymous` (default) trusts `X-Provider-Id` and falls back to the `providerId` of the body. It exists so a reviewer can call the API without infrastructure.
- `jwt` reads `Authorization: Bearer`, verifies the signature against the JWKS at `OIDC_JWKS_URL`, checks the issuer and the audience when they are configured, and takes `provider_id` from the claim. A missing, malformed, expired, or badly signed token answers `401`; an unreachable key set answers `503`, because that is an outage, not a credential problem.

`ProviderIdentityProtocol` lives beside the HTTP provider, and the factory refuses to boot the `jwt` mode without a JWKS URL. Keycloak runs under the compose profile `auth` with an imported realm; it is never required by a test.

The queue is an internal channel. A provider identity inside a message still goes through the domain rules.

## Consequences

- The default mode is honest about its trust: it trusts the caller. The README and the OpenAPI description say so.
- Enabling `jwt` is one variable and one compose profile, and the guard does not change.
- A production deployment replaces the demo realm with the provider's own client and keeps the same code.
- The trade-off is explicit: the anonymous mode must never face the public internet.
