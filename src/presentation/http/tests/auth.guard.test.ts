import { describe, expect, test } from 'bun:test'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { AuthGuard } from '../guards'
import { AnonymousProviderIdentity } from '../providers'
import type {
  ProviderIdentity,
  ProviderIdentityInput,
  ProviderIdentityProtocol,
} from '../providers'

const providerHeader = 'x-provider-id'
const authorizationHeader = 'authorization'
const token = 'Bearer a-token'
const headerProvider = 'provider-header'
const bodyProvider = 'provider-body'
const empty = String()

type Request = {
  headers: Record<string, string | undefined>
  body: { providerId: string }
  provider?: ProviderIdentity
}

class Recording implements ProviderIdentityProtocol {
  readonly seen: Array<ProviderIdentityInput> = []

  async identify(input: ProviderIdentityInput) {
    this.seen.push(input)

    return { providerId: input.header }
  }
}

const requestOf = (headers: Request['headers'], providerId: string): Request => ({
  headers,
  body: { providerId },
})

const contextOf = (request: Request) => new ExecutionContextHost([request, {}, undefined])

describe('AuthGuard', () => {
  test('WHEN the request arrives SHOULD hand the headers and the body provider to the identity', async () => {
    const identity = new Recording()
    const guard = new AuthGuard(identity)
    const request = requestOf({ [providerHeader]: headerProvider, [authorizationHeader]: token }, bodyProvider)

    const allowed = await guard.canActivate(contextOf(request))

    expect(allowed).toBe(true)
    expect(identity.seen).toEqual([
      { header: headerProvider, providerId: bodyProvider, credential: token },
    ])
    expect(request.provider).toEqual({ providerId: headerProvider })
  })

  test('WHEN the caller sends no header SHOULD resolve the provider of the body', async () => {
    const guard = new AuthGuard(new AnonymousProviderIdentity())
    const request = requestOf({}, bodyProvider)

    await guard.canActivate(contextOf(request))

    expect(request.provider).toEqual({ providerId: bodyProvider })
  })

  test('WHEN no header and no body provider arrive SHOULD resolve an empty provider', async () => {
    const guard = new AuthGuard(new AnonymousProviderIdentity())
    const request = requestOf({}, empty)

    await guard.canActivate(contextOf(request))

    expect(request.provider).toEqual({ providerId: empty })
  })
})
