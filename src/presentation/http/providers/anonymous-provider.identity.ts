import type {
  ProviderIdentity,
  ProviderIdentityInput,
  ProviderIdentityProtocol,
} from '@application/protocols'

const empty = String()

export class AnonymousProviderIdentity implements ProviderIdentityProtocol {
  identify(input: ProviderIdentityInput): ProviderIdentity {
    const blank = input.header === empty
    const providerId = blank ? input.providerId : input.header

    return { providerId }
  }
}