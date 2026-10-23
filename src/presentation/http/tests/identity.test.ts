import { describe, expect, test } from 'bun:test'
import { Theory } from '@infrastructure/protocols'
import { AnonymousProviderIdentity } from '../providers'

interface IdentityTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

type Params = { header: string; providerId: string; credential: string; expected: string }

const identity = new AnonymousProviderIdentity()

const identityOf = {
  body: 'provider-body',
  header: 'provider-header',
  credential: 'Bearer a-token',
  empty: '',
}

describe('AnonymousProviderIdentity', () => {
  describe('identify', () => {
    const theories: IdentityTheory<Params>[] = [
      {
        title: 'header present',
        description: 'WHEN the header carries a provider SHOULD trust it over the body',
        params: {
          header: identityOf.header,
          providerId: identityOf.body,
          credential: identityOf.credential,
          expected: identityOf.header,
        },
        expected: true,
      },
      {
        title: 'header absent',
        description: 'WHEN the header is empty SHOULD fall back to the body provider',
        params: {
          header: identityOf.empty,
          providerId: identityOf.body,
          credential: identityOf.empty,
          expected: identityOf.body,
        },
        expected: true,
      },
    ]

    const prove = async ({ params }: IdentityTheory<Params>) => {
      const output = await identity.identify({
        header: params.header,
        providerId: params.providerId,
        credential: params.credential,
      })
      const aligned = output.providerId === params.expected

      expect(aligned).toBe(true)
    }

    test.each(theories)('$title - $description', prove)
  })
})
