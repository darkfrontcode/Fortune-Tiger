import { HttpStatus } from '@nestjs/common'
import type { HttpType } from '../types'
import { ProviderIdentityError } from '../errors'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class ProviderIdentityHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const refused = exception instanceof ProviderIdentityError

    if (!refused) { return false }

    this.reply(response, HttpStatus.UNAUTHORIZED, exception.message)

    return true
  }
}
