import { Inject, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { ProviderIdentityProtocol } from '../../application/protocols'
import { PROVIDER_IDENTITY } from '../../application/tokens'
import type { HttpType } from './types'

const empty = String()
const providerHeader = 'x-provider-id'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PROVIDER_IDENTITY) private readonly identity: ProviderIdentityProtocol) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpType.Request>()
    const header = request.headers[providerHeader] ?? empty
    const body = request.body ?? {}
    const providerId = typeof body.providerId === 'string' ? body.providerId : empty
    const provider = this.identity.identify({ header, providerId })

    request.provider = provider

    return true
  }
}
