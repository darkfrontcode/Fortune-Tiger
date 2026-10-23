import type {
  ProviderIdentity,
  ProviderIdentityInput,
  ProviderIdentityProtocol,
} from '@presentation/http/providers'

const empty = String()

export class AnonymousProviderIdentity implements ProviderIdentityProtocol {
  async identify(input: ProviderIdentityInput): Promise<ProviderIdentity> {
    const blank = input.header === empty
    const providerId = blank ? input.providerId : input.header

    return { providerId }
  }
}
