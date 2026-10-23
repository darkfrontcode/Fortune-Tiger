import { afterEach, describe, expect, test } from 'bun:test'
import { Environment } from '@infrastructure/environment'
import { JWKS_URL_REQUIRED_MESSAGE } from '../data'
import { AnonymousProviderIdentity, JwtProviderIdentity } from '../providers'
import { ProviderIdentityFactory } from '../factories'

const variables = ['AUTH_MODE', 'OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_JWKS_URL']

const original: NodeJS.ProcessEnv = { ...process.env }

const restore = (name: string) => {
  const value = original[name]

  if (value === undefined) {
    delete process.env[name]

    return
  }

  process.env[name] = value
}

const factory = () => new ProviderIdentityFactory(new Environment())

describe('ProviderIdentityFactory', () => {
  afterEach(() => {
    variables.forEach(restore)
  })

  test('WHEN AUTH_MODE is absent SHOULD build the anonymous identity', () => {
    delete process.env.AUTH_MODE

    expect(factory().create()).toBeInstanceOf(AnonymousProviderIdentity)
  })

  test('WHEN AUTH_MODE is not jwt SHOULD build the anonymous identity', () => {
    process.env.AUTH_MODE = 'bearer'

    expect(factory().create()).toBeInstanceOf(AnonymousProviderIdentity)
  })

  test('WHEN AUTH_MODE is jwt SHOULD build the jwt identity from the environment', () => {
    process.env.AUTH_MODE = 'jwt'
    process.env.OIDC_ISSUER = 'https://issuer.test/realms/fortune-tiger'
    process.env.OIDC_AUDIENCE = 'fortune-tiger-api'
    process.env.OIDC_JWKS_URL = 'https://issuer.test/realms/fortune-tiger/protocol/openid-connect/certs'

    expect(factory().create()).toBeInstanceOf(JwtProviderIdentity)
  })

  test('WHEN AUTH_MODE is jwt without a JWKS URL SHOULD refuse to build', () => {
    process.env.AUTH_MODE = 'jwt'
    delete process.env.OIDC_JWKS_URL

    expect(() => factory().create()).toThrow(JWKS_URL_REQUIRED_MESSAGE)
  })
})
