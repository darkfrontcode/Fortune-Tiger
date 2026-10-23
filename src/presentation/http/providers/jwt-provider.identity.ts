import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import type { JWTPayload, JWTVerifyGetKey } from 'jose'
import type {
  ProviderIdentity,
  ProviderIdentityConfig,
  ProviderIdentityInput,
  ProviderIdentityProtocol,
} from '@presentation/http/providers'
import { ProviderIdentityError } from '@presentation/http/errors'

const scheme = 'bearer'
const separator = ' '
const prefix = `${scheme}${separator}`
const providerClaim = 'provider_id'
const empty = String()

const refusals = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
]

const refused = (error: unknown): boolean => refusals.some((failure) => error instanceof failure)

export class JwtProviderIdentity implements ProviderIdentityProtocol {
  private readonly keys: JWTVerifyGetKey

  constructor(private readonly config: ProviderIdentityConfig) {
    this.keys = createRemoteJWKSet(new URL(config.jwksUrl))
  }

  async identify(input: ProviderIdentityInput): Promise<ProviderIdentity> {
    const token = this.token(input.credential)
    const payload = await this.verify(token)
    const providerId = payload[providerClaim]

    if (typeof providerId !== 'string' || providerId === empty) {
      throw new ProviderIdentityError()
    }

    return { providerId }
  }

  private readonly token = (credential: string): string => {
    const malformed = !credential.toLowerCase().startsWith(prefix)
    const token = malformed ? empty : credential.slice(prefix.length).trim()

    if (token === empty) { throw new ProviderIdentityError() }

    return token
  }

  private readonly verify = async (token: string): Promise<JWTPayload> => {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      })

      return payload
    } catch (error) {
      if (refused(error)) { throw new ProviderIdentityError() }

      throw error
    }
  }
}
