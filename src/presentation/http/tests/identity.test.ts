import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../../application/protocols'
import { AnonymousProviderIdentity } from '../identity'

interface IdentityTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

type Params = { header: string; providerId: string; expected: string }

const identity = new AnonymousProviderIdentity()

const identityOf = {
  body: 'provider-body',
  header: 'provider-header',
  empty: '',
}

describe('AnonymousProviderIdentity', () => {
  describe('identify', () => {
    const theories: IdentityTheory<Params>[] = [
      {
        title: 'header present',
        description: 'WHEN the header carries a provider SHOULD trust it over the body',
        params: { header: identityOf.header, providerId: identityOf.body, expected: identityOf.header },
        expected: true,
      },
      {
        title: 'header absent',
        description: 'WHEN the header is empty SHOULD fall back to the body provider',
        params: { header: identityOf.empty, providerId: identityOf.body, expected: identityOf.body },
        expected: true,
      },
    ]

    const prove = ({ params }: IdentityTheory<Params>) => {
      const output = identity.identify({ header: params.header, providerId: params.providerId })
      const aligned = output.providerId === params.expected

      expect(aligned).toBe(true)
    }

    test.each(theories)('$title - $description', prove)
  })
})
