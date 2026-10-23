export type ProviderIdentityInput = {
  header: string
  providerId: string
  credential: string
}

export type ProviderIdentity = {
  providerId: string
}

export type ProviderIdentityConfig = {
  issuer: string | undefined
  audience: string | undefined
  jwksUrl: string
}

export interface ProviderIdentityProtocol {
  identify(input: ProviderIdentityInput): Promise<ProviderIdentity>
}
