import { Inject, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { ProviderIdentityProtocol } from '@presentation/http/providers'
import { PROVIDER_IDENTITY } from '../tokens'
import type { HttpType } from '../types'

const empty = String()
const providerHeader = 'x-provider-id'
const authorizationHeader = 'authorization'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PROVIDER_IDENTITY) private readonly identity: ProviderIdentityProtocol) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpType.Request>()
    const header = request.headers[providerHeader] ?? empty
    const credential = request.headers[authorizationHeader] ?? empty
    const body = request.body ?? {}
    const providerId = typeof body.providerId === 'string' ? body.providerId : empty
    const provider = await this.identity.identify({ header, providerId, credential })

    request.provider = provider

    return true
  }
}