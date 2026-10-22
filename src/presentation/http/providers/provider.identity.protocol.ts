export type ProviderIdentityInput = {
  header: string
  providerId: string
}

export type ProviderIdentity = {
  providerId: string
}

export interface ProviderIdentityProtocol {
  identify(input: ProviderIdentityInput): ProviderIdentity
}
