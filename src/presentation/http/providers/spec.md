# Providers

This folder owns the presentation-specific provider identity contract and its default implementation. `ProviderIdentityProtocol` resolves the effective provider identity for an HTTP request from the incoming header and request payload. `AnonymousProviderIdentity` resolves the header when present, falling back to the payload provider identifier.
