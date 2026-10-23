import { afterAll, describe, expect, test } from 'bun:test'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import type { JWK, JWTPayload } from 'jose'
import { JwtProviderIdentity } from '../providers'
import { ProviderIdentityError } from '../errors'
import type { ProviderIdentityConfig } from '../providers'

type SigningKey = Parameters<SignJWT['sign']>[0]

type Issue = {
  claims: JWTPayload
  key: SigningKey | undefined
  kid: string
  issuer: string
  audience: string
  expiration: number
}

const algorithm = 'RS256'
const issuer = 'https://keycloak.test/realms/fortune-tiger'
const audience = 'fortune-tiger-api'
const providerId = 'provider-a'
const kid = 'fortune-tiger-key'
const lifetime = 300
const empty = String()

const pair = await generateKeyPair(algorithm)
const publicKey = await exportJWK(pair.publicKey)
const signingKey = { ...publicKey, kid, alg: algorithm, use: 'sig' }
const server = Bun.serve({ port: 0, fetch: () => Response.json({ keys: [signingKey] }) })
const jwksUrl = `http://127.0.0.1:${server.port}/jwks`
const now = Math.floor(Date.now() / 1000)

const config: ProviderIdentityConfig = { issuer, audience, jwksUrl }
const identity = new JwtProviderIdentity(config)

const issue = (overrides: Partial<Issue> = {}): Promise<string> => {
  const claims = overrides.claims ?? { provider_id: providerId }
  const key = overrides.key ?? pair.privateKey

  return new SignJWT(claims)
    .setProtectedHeader({ alg: algorithm, kid: overrides.kid ?? kid })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(overrides.expiration ?? now + lifetime)
    .sign(key)
}

const attempt = (credential: string) => identity.identify({ header: empty, providerId: empty, credential })

const bearer = (token: string) => `Bearer ${token}`

describe('JwtProviderIdentity', () => {
  afterAll(async () => {
    await server.stop(true)
  })

  test('WHEN the token is valid SHOULD answer the provider of the claim', async () => {
    const token = await issue()
    const output = await attempt(bearer(token))

    expect(output.providerId).toBe(providerId)
  })

  test('WHEN the authorization header is missing SHOULD refuse', async () => {
    await expect(attempt(empty)).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the scheme is not bearer SHOULD refuse', async () => {
    const token = await issue()

    await expect(attempt(`Basic ${token}`)).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the header carries the scheme with no token SHOULD refuse', async () => {
    await expect(attempt('Bearer ')).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the token is expired SHOULD refuse', async () => {
    const token = await issue({ expiration: now - lifetime })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the signature does not match the key set SHOULD refuse', async () => {
    const foreign = await generateKeyPair(algorithm)
    const token = await issue({ key: foreign.privateKey })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the key id is unknown SHOULD refuse', async () => {
    const token = await issue({ kid: 'unknown-key' })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the payload carries no provider claim SHOULD refuse', async () => {
    const token = await issue({ claims: { provider: providerId } })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the issuer differs SHOULD refuse', async () => {
    const token = await issue({ issuer: 'https://another.test/realms/fortune-tiger' })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the audience differs SHOULD refuse', async () => {
    const token = await issue({ audience: 'another-api' })

    await expect(attempt(bearer(token))).rejects.toBeInstanceOf(ProviderIdentityError)
  })

  test('WHEN the key set cannot be reached SHOULD keep the transport error', async () => {
    const unreachable = new JwtProviderIdentity({ issuer, audience, jwksUrl: 'http://127.0.0.1:1/jwks' })
    const token = await issue()
    const error: unknown = await unreachable
      .identify({ header: empty, providerId: empty, credential: bearer(token) })
      .catch((failure: unknown) => failure)

    expect(error).not.toBeInstanceOf(ProviderIdentityError)
    expect(error).toBeInstanceOf(Error)
  })
})
