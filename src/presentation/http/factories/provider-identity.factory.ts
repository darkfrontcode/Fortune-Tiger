import { Injectable } from '@nestjs/common'
import { Environment } from '@infrastructure/environment'
import { JWKS_URL_REQUIRED_MESSAGE } from '../data'
import { AnonymousProviderIdentity, JwtProviderIdentity } from '../providers'
import type { ProviderIdentityConfig, ProviderIdentityProtocol } from '../providers'

const jwtMode = 'jwt'
const empty = String()

@Injectable()
export class ProviderIdentityFactory {
  constructor(private readonly environment: Environment) {}

  create(): ProviderIdentityProtocol {
    if (this.environment.authMode !== jwtMode) { return new AnonymousProviderIdentity() }

    const jwksUrl = this.environment.oidcJwksUrl

    if (jwksUrl === undefined || jwksUrl === empty) { throw new Error(JWKS_URL_REQUIRED_MESSAGE) }

    const config: ProviderIdentityConfig = {
      issuer: this.environment.oidcIssuer,
      audience: this.environment.oidcAudience,
      jwksUrl,
    }

    return new JwtProviderIdentity(config)
  }
}
